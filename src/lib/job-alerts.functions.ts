import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchJobsForQuery, type JobHit } from "./smart-apply-search";

const FREE_MAX_SEARCHES = 1;

async function getPlan(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  return data?.plan ?? "free";
}

async function enforceSearchLimit(supabase: any, userId: string) {
  const plan = await getPlan(supabase, userId);
  if (plan === "premium") return;
  const { count } = await supabase
    .from("saved_job_searches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);
  if ((count ?? 0) >= FREE_MAX_SEARCHES) {
    throw new Error(`Free plan allows ${FREE_MAX_SEARCHES} saved job alert. Upgrade for unlimited alerts.`);
  }
}

export type SavedSearch = {
  id: string;
  user_id: string;
  role: string;
  location: string;
  seniority: string;
  frequency: "daily" | "weekly";
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export const saveJobSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        role: z.string().min(2).max(120),
        location: z.string().max(120).default(""),
        seniority: z.string().max(40).default(""),
        frequency: z.enum(["daily", "weekly"]).default("daily"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceSearchLimit(context.supabase, context.userId);
    const { data: inserted, error } = await context.supabase
      .from("saved_job_searches")
      .insert({
        user_id: context.userId,
        role: data.role,
        location: data.location,
        seniority: data.seniority,
        frequency: data.frequency,
        is_active: true,
      } as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { search: inserted as SavedSearch };
  });

export const listSavedSearches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("saved_job_searches")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { searches: (data ?? []) as SavedSearch[] };
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_job_searches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_job_searches")
      .update({ is_active: data.isActive } as any)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AlertedJob = {
  id: string;
  user_id: string;
  search_id: string;
  job_url: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  source: string;
  notified: boolean;
  created_at: string;
};

export const runJobSearchAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: search, error } = await context.supabase
      .from("saved_job_searches")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error || !search) throw new Error("Saved search not found.");

    const jobs = await searchJobsForQuery({
      role: search.role,
      location: search.location,
      seniority: search.seniority,
    });

    const { data: existing } = await context.supabase
      .from("search_alerted_jobs")
      .select("job_url")
      .eq("search_id", data.id);
    const seen = new Set((existing ?? []).map((e: any) => e.job_url));

    const newJobs = jobs.filter((j) => !seen.has(j.url)).slice(0, 10);
    if (newJobs.length) {
      const inserts = newJobs.map((j) => ({
        user_id: context.userId,
        search_id: data.id,
        job_url: j.url,
        title: j.title,
        company: j.company,
        location: j.location,
        snippet: j.snippet,
        source: j.source,
        notified: false,
      }));
      const { error: insertErr } = await context.supabase.from("search_alerted_jobs").insert(inserts as any[]);
      if (insertErr) throw new Error(insertErr.message);
    }

    await context.supabase
      .from("saved_job_searches")
      .update({ last_run_at: new Date().toISOString() } as any)
      .eq("id", data.id);

    return { newJobs, total: jobs.length };
  });

export const getPendingJobAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("search_alerted_jobs")
      .select("*")
      .eq("user_id", context.userId)
      .eq("notified", false)
      .order("created_at", { ascending: false });
    return { alerts: (data ?? []) as AlertedJob[] };
  });

export const markJobAlertsNotified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("search_alerted_jobs")
      .update({ notified: true } as any)
      .in("id", data.ids)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
