import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGateway } from "./ai-gateway.server";
import { searchJobsForQuery, type JobHit } from "./smart-apply-search";

export type { JobHit } from "./smart-apply-search";

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
    const jobs = await searchJobsForQuery({
      role: data.role,
      location: data.location,
      seniority: data.seniority,
    });
    return { jobs };
  });

// ---------- Batch salary estimates for search results ----------
const salaryEstimateSchema = z.object({
  estimates: z.array(
    z.object({
      id: z.string(),
      low: z.number().default(0),
      high: z.number().default(0),
      currency: z.string().default("USD"),
      period: z.enum(["year", "month", "hour"]).default("year"),
      confidence: z.enum(["low", "medium", "high"]).default("low"),
    }),
  ),
});

export type SalaryEstimate = z.infer<typeof salaryEstimateSchema>["estimates"][number];

export const estimateSalaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        seniority: z.string().max(40).default(""),
        location: z.string().max(120).default(""),
        jobs: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              company: z.string().default(""),
              location: z.string().default(""),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforcePremium(context.supabase, context.userId);
    const gateway = getGateway();

    const list = data.jobs
      .map(
        (j, i) =>
          `${i + 1}. id=${j.id} | ${j.title}${j.company ? ` @ ${j.company}` : ""}${j.location ? ` — ${j.location}` : ""}`,
      )
      .join("\n");

    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: salaryEstimateSchema,
        maxRetries: 2,
        system:
          "You estimate realistic annual salary ranges for job postings using market data. Consider role, seniority, and location (currency should match the location's local currency — ZAR for South Africa, GBP for UK, EUR for EU, USD default). Return ONE estimate per input id, preserving the exact id string. Use confidence 'low' when signal is thin, 'high' when role+location are clear. Ranges are annual gross.",
        prompt: `Seniority: ${data.seniority || "unspecified"}\nSearch location: ${data.location || "unspecified"}\n\nJobs:\n${list}`,
      });
      const byId = new Map(object.estimates.map((e) => [e.id, e]));
      return {
        estimates: data.jobs.map(
          (j) =>
            byId.get(j.id) ?? {
              id: j.id,
              low: 0,
              high: 0,
              currency: "USD",
              period: "year" as const,
              confidence: "low" as const,
            },
        ),
      };
    } catch (e: any) {
      console.error("[smart-apply] salary estimate failed", e);
      return { estimates: [] as SalaryEstimate[] };
    }
  });

// ---------- Batch match-score estimates against candidate CV ----------
const matchScoreSchema = z.object({
  scores: z.array(
    z.object({
      id: z.string(),
      score: z.number().int().min(0).max(100).default(0),
      matched: z.array(z.string()).default([]),
      missing: z.array(z.string()).default([]),
    }),
  ),
});

export type MatchScoreEstimate = z.infer<typeof matchScoreSchema>["scores"][number];

export const estimateMatchScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cvText: z.string().min(20).max(20000),
        jobs: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              company: z.string().default(""),
              location: z.string().default(""),
              snippet: z.string().default(""),
            }),
          )
          .min(1)
          .max(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforcePremium(context.supabase, context.userId);
    const gateway = getGateway();

    const list = data.jobs
      .map(
        (j, i) =>
          `${i + 1}. id=${j.id}\nTitle: ${j.title}${j.company ? ` @ ${j.company}` : ""}${j.location ? ` — ${j.location}` : ""}\nSnippet: ${(j.snippet || "").slice(0, 500)}`,
      )
      .join("\n\n");

    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: matchScoreSchema,
        maxRetries: 2,
        system:
          "You rate how well a candidate's CV fits each job posting. Return ONE score per input id (preserve the exact id string). score is 0-100, be honest and calibrated: 80+ strong fit, 60-79 decent fit with gaps, 40-59 partial fit, <40 weak fit. Provide up to 5 matched skills/keywords the CV covers and up to 5 missing ones the job requires.",
        prompt: `CANDIDATE CV:\n${data.cvText.slice(0, 8000)}\n\nJOBS:\n${list}`,
      });
      const byId = new Map(object.scores.map((s) => [s.id, s]));
      return {
        scores: data.jobs.map(
          (j) =>
            byId.get(j.id) ?? {
              id: j.id,
              score: 0,
              matched: [] as string[],
              missing: [] as string[],
            },
        ),
      };
    } catch (e: any) {
      console.error("[smart-apply] match score failed", e);
      return { scores: [] as MatchScoreEstimate[] };
    }
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
  outreachEmail: z.string().min(50).default(""),
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
        "You are a senior career coach. Tailor the candidate's CV to the job (ATS-friendly, ~400-600 words with sections Summary, Experience, Skills, Education). Write a strong, specific 250-320 word cover letter addressed to the company. Also write a short, polite recruiter outreach email (100-160 words) expressing interest, mentioning 1-2 relevant strengths, and asking about next steps. Give an honest matchScore (0-100), matched & missing skills, and a realistic salary range based on role, location, and seniority. Always fill every field of the schema — never leave arrays or strings blank; if unsure, infer sensibly.",
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
