import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGateway } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

async function enforcePremium(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.plan !== "premium") {
    throw new Error("Smart Apply is a Premium feature. Upgrade to unlock.");
  }
}

// ---------- Save / load base CV ----------
export const getBaseCv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("base_cv_text")
      .eq("id", context.userId)
      .maybeSingle();
    return { baseCv: (data as any)?.base_cv_text ?? "" };
  });

export const saveBaseCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cvText: z.string().max(40000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ base_cv_text: data.cvText } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Job search via Firecrawl ----------
export type JobHit = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
  source: string;
};

function hostnameOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function splitTitleCompany(raw: string, host: string): { title: string; company: string } {
  // Common patterns: "Frontend Developer at Acme - Remote | LinkedIn"
  const cleaned = raw.replace(/\s+\|\s+(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Workable).*$/i, "").trim();
  let m = cleaned.match(/^(.+?)\s+(?:at|@|-|—|·|\|)\s+(.+?)(?:\s+(?:in|-|—|·|\|)\s+.+)?$/i);
  if (m) return { title: m[1].trim(), company: m[2].trim() };
  return { title: cleaned, company: host.split(".")[0] || "Unknown" };
}

export const searchJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        role: z.string().min(2).max(120),
        location: z.string().max(120).optional().default(""),
        seniority: z.string().max(40).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforcePremium(context.supabase, context.userId);

    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("Job search isn't configured. Please contact support.");

    const parts = [data.seniority, data.role, "jobs"];
    if (data.location) parts.push(`in ${data.location}`);
    const query = `${parts.filter(Boolean).join(" ")} site:linkedin.com/jobs OR site:indeed.com OR site:greenhouse.io OR site:lever.co OR site:workable.com OR site:glassdoor.com`;

    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 20,
        tbs: "qdr:m",
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("Job search quota exhausted. Please try again later.");
      throw new Error(`Job search failed (${res.status}). ${txt.slice(0, 200)}`);
    }

    const json: any = await res.json().catch(() => ({}));
    const raw: any[] = json?.data?.web ?? json?.data ?? json?.web ?? [];

    const jobs: JobHit[] = raw
      .filter((r) => r?.url && r?.title)
      .slice(0, 20)
      .map((r, i) => {
        const host = hostnameOf(r.url);
        const { title, company } = splitTitleCompany(String(r.title), host);
        return {
          id: `${i}-${r.url}`,
          title,
          company,
          location: data.location || "",
          url: r.url,
          snippet: String(r.description || r.snippet || "").slice(0, 600),
          source: host,
        };
      });

    return { jobs };
  });

// ---------- Tailor for a chosen job ----------
const packSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  missingKeywords: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  tailoredCv: z.string().min(50),
  coverLetter: z.string().min(50),
  salary: z.object({
    low: z.number().default(0),
    high: z.number().default(0),
    currency: z.string().default("USD"),
    period: z.enum(["year", "month", "hour"]).default("year"),
    confidence: z.enum(["low", "medium", "high"]).default("low"),
    reasoning: z.string().default(""),
  }),
});

async function fetchJobDescription(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !url) return "";
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 20000,
      }),
    });
    if (!res.ok) return "";
    const json: any = await res.json().catch(() => ({}));
    const md: string = json?.data?.markdown ?? json?.markdown ?? "";
    return md.slice(0, 12000);
  } catch {
    return "";
  }
}

export const tailorForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobTitle: z.string().min(2),
        company: z.string().min(1),
        location: z.string().default(""),
        jobSnippet: z.string().default(""),
        jobUrl: z.string().url().optional(),
        cvText: z.string().min(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforcePremium(context.supabase, context.userId);
    const gateway = getGateway();

    const fullDesc = data.jobUrl ? await fetchJobDescription(data.jobUrl) : "";
    const jobBody = (fullDesc || data.jobSnippet || `${data.jobTitle} at ${data.company}`).slice(0, 12000);

    let pack: z.infer<typeof packSchema>;
    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: packSchema,
        maxRetries: 2,
        system:
          "You are a senior career coach. Tailor the candidate's CV to the job (ATS-friendly, ~400-600 words with sections Summary, Experience, Skills, Education). Write a strong, specific 250-320 word cover letter addressed to the company. Give an honest matchScore (0-100), matched & missing skills, and a realistic salary range based on role, location, and seniority. Always fill every field of the schema — never leave arrays or strings blank; if unsure, infer sensibly.",
        prompt: `JOB:\nCompany: ${data.company}\nRole: ${data.jobTitle}\nLocation: ${data.location}\n\nJob description:\n${jobBody}\n\nCANDIDATE CV:\n${data.cvText.slice(0, 12000)}`,
      });
      pack = object;
    } catch (e: any) {
      console.error("[smart-apply] pack generation failed", e);
      const msg = String(e?.message ?? "");
      if (msg.includes("402") || msg.toLowerCase().includes("credit")) {
        throw new Error("AI credits exhausted. Please try again later.");
      }
      if (msg.includes("429")) {
        throw new Error("Rate limited. Wait a few seconds and try again.");
      }
      throw new Error("Couldn't tailor for this job. Try another one or shorten your CV.");
    }

    try {
      await context.supabase
        .from("usage_events")
        .insert({ user_id: context.userId, feature: "smart_apply" });
    } catch (e) {
      console.warn("usage log failed", e);
    }

    return {
      job: {
        company: data.company,
        role: data.jobTitle,
        location: data.location,
        url: data.jobUrl ?? "",
      },
      ...pack,
    };
  });

// ---------- Shortlist ----------
export const listShortlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("shortlisted_jobs")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { jobs: (data ?? []) as any[] };
  });

export const addToShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobUrl: z.string().url(),
        title: z.string().min(1),
        company: z.string().min(1),
        location: z.string().default(""),
        snippet: z.string().default(""),
        source: z.string().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shortlisted_jobs")
      .upsert(
        {
          user_id: context.userId,
          job_url: data.jobUrl,
          title: data.title,
          company: data.company,
          location: data.location,
          snippet: data.snippet,
          source: data.source,
        } as any,
        { onConflict: "user_id,job_url" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shortlisted_jobs")
      .delete()
      .eq("user_id", context.userId)
      .eq("job_url", data.jobUrl);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Persist pack to tracker ----------
export const saveApplicationPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobUrl: z.string().url().optional().nullable(),
        company: z.string().min(1),
        role: z.string().min(1),
        location: z.string().optional().default(""),
        matchScore: z.number().int().min(0).max(100),
        matchedSkills: z.array(z.string()).default([]),
        missingSkills: z.array(z.string()).default([]),
        tailoredCv: z.string(),
        coverLetter: z.string(),
        salary: z
          .object({
            low: z.number(),
            high: z.number(),
            currency: z.string(),
            period: z.string(),
          })
          .optional()
          .nullable(),
        notes: z.string().optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: app, error: appErr } = await context.supabase
      .from("applications")
      .insert({
        user_id: context.userId,
        company: data.company,
        role: data.role,
        status: "applied",
        applied_date: today,
        url: data.jobUrl ?? null,
        notes: data.notes || null,
      } as any)
      .select("id")
      .single();
    if (appErr) throw new Error(appErr.message);

    const { error: packErr } = await context.supabase
      .from("application_packs")
      .insert({
        user_id: context.userId,
        application_id: (app as any).id,
        job_url: data.jobUrl ?? null,
        job_company: data.company,
        job_role: data.role,
        job_location: data.location || null,
        match_score: data.matchScore,
        matched_skills: data.matchedSkills,
        missing_skills: data.missingSkills,
        tailored_cv: data.tailoredCv,
        cover_letter: data.coverLetter,
        salary_low: data.salary?.low ?? null,
        salary_high: data.salary?.high ?? null,
        salary_currency: data.salary?.currency ?? null,
        salary_period: data.salary?.period ?? null,
        raw: data as any,
      } as any);
    if (packErr) throw new Error(packErr.message);

    return { ok: true, applicationId: (app as any).id };
  });

export const getApplicationPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pack } = await context.supabase
      .from("application_packs")
      .select("*")
      .eq("application_id", data.applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { pack: pack ?? null };
  });
