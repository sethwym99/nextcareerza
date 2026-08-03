import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRow = {
  id: string;
  status: string;
  applied_date: string | null;
  interview_date: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
  company: string;
  role: string;
};

function daysBetween(a: string, b: string) {
  const start = new Date(a);
  const end = new Date(b);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function hostnameOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatWeekLabel(d: Date) {
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

export const getApplicationAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: apps } = await context.supabase
      .from("applications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const rows = (apps ?? []) as AppRow[];
    const total = rows.length;

    const responded = rows.filter((a) => a.status !== "applied").length;
    const interviewed = rows.filter((a) => ["interview", "offer", "accepted"].includes(a.status)).length;
    const offered = rows.filter((a) => ["offer", "accepted"].includes(a.status)).length;

    const responseRate = total ? Math.round((responded / total) * 100) : 0;
    const interviewRate = total ? Math.round((interviewed / total) * 100) : 0;
    const offerRate = total ? Math.round((offered / total) * 100) : 0;

    const pipeline: Record<string, number> = {
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      accepted: 0,
    };
    for (const a of rows) {
      pipeline[a.status] = (pipeline[a.status] ?? 0) + 1;
    }

    const interviewDeltas = rows
      .filter((a) => a.applied_date && a.interview_date)
      .map((a) => daysBetween(a.applied_date!, a.interview_date!));
    const avgDaysToInterview = interviewDeltas.length
      ? Math.round(interviewDeltas.reduce((a, b) => a + b, 0) / interviewDeltas.length)
      : null;

    const offerDeltas = rows
      .filter((a) => ["offer", "accepted"].includes(a.status))
      .map((a) => {
        const start = a.applied_date ? new Date(a.applied_date) : new Date(a.created_at);
        const end = new Date(a.updated_at);
        return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      });
    const avgDaysToOffer = offerDeltas.length
      ? Math.round(offerDeltas.reduce((a, b) => a + b, 0) / offerDeltas.length)
      : null;

    const now = new Date();
    const weekly: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = rows.filter((a) => {
        const d = new Date(a.created_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      weekly.push({ label: formatWeekLabel(weekStart), count });
    }

    const sourceCounts: Record<string, number> = {};
    for (const a of rows) {
      if (!a.url) continue;
      const host = hostnameOf(a.url);
      if (!host) continue;
      sourceCounts[host] = (sourceCounts[host] ?? 0) + 1;
    }
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const { data: packs } = await context.supabase
      .from("application_packs")
      .select("job_role, job_company, match_score")
      .eq("user_id", context.userId)
      .order("match_score", { ascending: false })
      .limit(5);
    const bestMatches = (packs ?? []).map((p: any) => ({
      role: p.job_role,
      company: p.job_company,
      score: p.match_score ?? 0,
    }));

    return {
      total,
      responseRate,
      interviewRate,
      offerRate,
      pipeline,
      avgDaysToInterview,
      avgDaysToOffer,
      weekly,
      topSources,
      bestMatches,
    };
  });
