import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { searchJobsForQuery, type JobHit } from "@/lib/smart-apply-search";

const SENDER_DOMAIN = process.env["EMAIL_SENDER_DOMAIN"] ?? "notify.nextcareer.one";
const FROM_EMAIL = `NextCareer <alerts@${SENDER_DOMAIN}>`;

export const Route = createFileRoute("/api/public/hooks/run-job-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
        if (!expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: searches, error: searchErr } = await supabase
          .from("saved_job_searches")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (searchErr) {
          console.error("[job-alerts] failed to load searches", searchErr);
          return Response.json({ error: "Failed to load searches" }, { status: 500 });
        }

        const userIds = [...new Set((searches ?? []).map((s: any) => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, plan")
          .in("id", userIds);
        const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        const newAlertsByUser = new Map<string, JobHit[]>();
        let processed = 0;

        for (const search of searches ?? []) {
          processed++;
          try {
            const jobs = await searchJobsForQuery({
              role: search.role,
              location: search.location,
              seniority: search.seniority,
            });

            const { data: existing } = await supabase
              .from("search_alerted_jobs")
              .select("job_url")
              .eq("search_id", search.id);
            const seen = new Set((existing ?? []).map((e: any) => e.job_url));

            const newJobs = jobs.filter((j) => !seen.has(j.url)).slice(0, 10);
            if (newJobs.length) {
              const inserts = newJobs.map((j) => ({
                user_id: search.user_id,
                search_id: search.id,
                job_url: j.url,
                title: j.title,
                company: j.company,
                location: j.location,
                snippet: j.snippet,
                source: j.source,
                notified: false,
              }));
              const { error: insertErr } = await supabase
                .from("search_alerted_jobs")
                .insert(inserts as any[]);
              if (insertErr) {
                console.error("[job-alerts] insert failed", insertErr);
                continue;
              }
              if (!newAlertsByUser.has(search.user_id)) {
                newAlertsByUser.set(search.user_id, []);
              }
              newAlertsByUser.get(search.user_id)!.push(...newJobs);
            }

            await supabase
              .from("saved_job_searches")
              .update({ last_run_at: new Date().toISOString() } as any)
              .eq("id", search.id);
          } catch (e) {
            console.error("[job-alerts] search failed", { search: search.id, error: e });
          }
        }

        for (const [userId, jobs] of newAlertsByUser.entries()) {
          const profile = profileById.get(userId);
          if (!profile?.email) continue;

          const messageId = crypto.randomUUID();
          const runId = crypto.randomUUID();
          const subject = `🎯 ${jobs.length} new job match${jobs.length === 1 ? "" : "es"} for you`;
          const html = buildDigestHtml(jobs);
          const text = buildDigestText(jobs);

          try {
            await supabase.from("email_send_log").insert({
              message_id: messageId,
              template_name: "job-alert-digest",
              recipient_email: profile.email,
              status: "pending",
            });

            const { error: enqueueErr } = await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                run_id: runId,
                message_id: messageId,
                to: profile.email,
                from: FROM_EMAIL,
                sender_domain: SENDER_DOMAIN,
                subject,
                html,
                text,
                purpose: "transactional",
                label: "job-alert-digest",
                queued_at: new Date().toISOString(),
              },
            });

            if (enqueueErr) {
              console.error("[job-alerts] enqueue failed", enqueueErr);
              await supabase.from("email_send_log").insert({
                message_id: messageId,
                template_name: "job-alert-digest",
                recipient_email: profile.email,
                status: "failed",
                error_message: "Failed to enqueue digest",
              });
            }
          } catch (e) {
            console.error("[job-alerts] email setup failed", e);
          }
        }

        return Response.json({
          processed,
          alertedUsers: newAlertsByUser.size,
          totalNewJobs: [...newAlertsByUser.values()].reduce((a, b) => a + b.length, 0),
        });
      },
    },
  },
});

function buildDigestHtml(jobs: JobHit[]) {
  const rows = jobs
    .map(
      (j) =>
        `<li style="margin-bottom:12px;">
          <a href="${j.url}" style="font-weight:600;color:#3B82F6;text-decoration:none;">${j.title}</a>
          <div style="color:#555;font-size:14px;">${j.company}${j.location ? ` · ${j.location}` : ""}</div>
          <div style="color:#777;font-size:13px;margin-top:4px;">${j.snippet.slice(0, 180)}…</div>
        </li>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;color:#111;background:#f7f7fb;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <h2 style="margin-top:0;">New job matches</h2>
      <p style="color:#555;">We found ${jobs.length} fresh listing${jobs.length === 1 ? "" : "s"} that match your saved search. Open them in Smart Apply to tailor your CV.</p>
      <ul style="padding-left:0;list-style:none;">${rows}</ul>
      <div style="margin-top:24px;text-align:center;">
        <a href="https://nextcareer.one/smart-apply" style="display:inline-block;background:#3B82F6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">View in NextCareer</a>
      </div>
      <p style="font-size:12px;color:#999;margin-top:24px;">You're receiving this because you saved a job alert in NextCareer.</p>
    </div>
  </body>
</html>`;
}

function buildDigestText(jobs: JobHit[]) {
  const lines = jobs
    .map((j) => `${j.title} @ ${j.company}${j.location ? ` — ${j.location}` : ""}\n${j.url}\n`)
    .join("\n");
  return `New job matches\n\nWe found ${jobs.length} fresh listing${jobs.length === 1 ? "" : "s"} for your saved search.\n\n${lines}\nOpen NextCareer to tailor your CV: https://nextcareer.one/smart-apply`;
}
