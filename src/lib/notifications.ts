/**
 * Local notifications wrapper. Silent no-op on web (no service worker).
 * Schedules reminders for application interviews and follow-ups on native.
 */
import { isNativeApp } from "./platform";

type ScheduleInput = {
  id: number;
  title: string;
  body: string;
  at: Date;
};

let permissionRequested = false;

async function getPlugin() {
  if (!isNativeApp()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const LN = await getPlugin();
  if (!LN) return false;
  try {
    const status = await LN.checkPermissions();
    if (status.display === "granted") return true;
    if (permissionRequested) return false;
    permissionRequested = true;
    const req = await LN.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

/**
 * Stable numeric id from a UUID + kind. Local Notifications requires int32 ids.
 */
export function notifId(uuid: string, kind: string): number {
  const s = `${uuid}:${kind}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

export async function scheduleReminder(input: ScheduleInput): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  // Skip past dates
  if (input.at.getTime() <= Date.now()) return;
  try {
    await LN.schedule({
      notifications: [
        {
          id: input.id,
          title: input.title,
          body: input.body,
          schedule: { at: input.at, allowWhileIdle: true },
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
  } catch {
    /* ignore */
  }
}

export async function cancelReminders(ids: number[]): Promise<void> {
  const LN = await getPlugin();
  if (!LN || ids.length === 0) return;
  try {
    await LN.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

/**
 * Schedule 9am-local reminders for a tracked application. Cancels prior ones.
 */
export async function syncApplicationReminders(app: {
  id: string;
  company: string;
  role: string;
  interview_date: string | null;
  follow_up_date: string | null;
}): Promise<void> {
  if (!isNativeApp()) return;
  const interviewId = notifId(app.id, "interview");
  const dayBeforeId = notifId(app.id, "interview-1d");
  const followId = notifId(app.id, "follow-up");
  await cancelReminders([interviewId, dayBeforeId, followId]);

  if (app.interview_date) {
    const at = atLocalNine(app.interview_date);
    await scheduleReminder({
      id: interviewId,
      title: `Interview today: ${app.company}`,
      body: `${app.role} — good luck!`,
      at,
    });
    const dayBefore = new Date(at);
    dayBefore.setDate(dayBefore.getDate() - 1);
    await scheduleReminder({
      id: dayBeforeId,
      title: `Interview tomorrow: ${app.company}`,
      body: `Prep for your ${app.role} interview.`,
      at: dayBefore,
    });
  }
  if (app.follow_up_date) {
    await scheduleReminder({
      id: followId,
      title: `Follow up with ${app.company}`,
      body: `Send a quick check-in about the ${app.role} role.`,
      at: atLocalNine(app.follow_up_date),
    });
  }
}

export async function cancelApplicationReminders(id: string): Promise<void> {
  await cancelReminders([
    notifId(id, "interview"),
    notifId(id, "interview-1d"),
    notifId(id, "follow-up"),
  ]);
}

export async function scheduleJobAlertNotifications(
  alerts: { id: string; title: string; company: string }[],
): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  if (alerts.length === 0) return;

  const notifications = alerts.map((a, i) => ({
    id: notifId(a.id, "job-alert"),
    title: `New job match: ${a.title}`,
    body: `${a.company} — open Smart Apply to tailor your CV.`,
    schedule: { at: new Date(Date.now() + (i + 1) * 60_000), allowWhileIdle: true },
    smallIcon: "ic_stat_icon_config_sample",
  }));

  try {
    await LN.schedule({ notifications });
  } catch {
    /* ignore */
  }
}

function atLocalNine(iso: string): Date {
  // iso is a date-only string 'YYYY-MM-DD'
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 9, 0, 0, 0);
}
