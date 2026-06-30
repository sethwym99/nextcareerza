import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGateway } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";
const FREE_LIMIT = 1;

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s === -1 || e === -1 || e <= s) return null;
    try {
      return JSON.parse(cleaned.slice(s, e + 1)) as T;
    } catch {
      return null;
    }
  }
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<\/(p|div|li|h\d|br|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJobPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NextCareerBot/1.0; +https://nextcareerza.lovable.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    let received = 0;
    const max = 512 * 1024;
    let html = "";
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (received >= max) break;
    }
    return htmlToText(html).slice(0, 14000);
  } catch {
    return null;
  }
}

async function enforceSmartLimit(supabase: any, userId: string) {
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

// ---------- Smart Apply ----------
type JobInfo = {
  company: string;
  role: string;
  location: string;
  seniority: string;
  requiredSkills: string[];
  salaryRaw?: string;
  descriptionText: string;
};

export const smartApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        jobUrl: z.string().url().optional(),
        jobText: z.string().optional(),
        cvText: z.string().min(20),
      })
      .refine((v) => v.jobUrl || (v.jobText && v.jobText.length > 40), {
        message: "Provide a job URL or paste the job description.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceSmartLimit(context.supabase, context.userId);
    const gateway = getGateway();

    let descriptionText = data.jobText?.trim() ?? "";
    let fetchedFromUrl = false;
    if (data.jobUrl && descriptionText.length < 80) {
      const fetched = await fetchJobPage(data.jobUrl);
      if (fetched && fetched.length > 200) {
        descriptionText = fetched;
        fetchedFromUrl = true;
      }
    }
    if (descriptionText.length < 80) {
      throw new Error(
        "Couldn't read that job page (the site likely blocks scraping). Switch to 'Paste text' and paste the job description.",
      );
    }

    // Step 1: extract structured job info via structured output
    const jobInfoSchema = z.object({
      company: z.string().default("Unknown"),
      role: z.string().default("Unknown role"),
      location: z.string().default(""),
      seniority: z
        .enum(["intern", "junior", "mid", "senior", "lead", "exec", "unknown"])
        .default("unknown"),
      requiredSkills: z.array(z.string()).default([]),
      salaryRaw: z.string().default(""),
      descriptionText: z.string().default(""),
    });
    type JobInfo = z.infer<typeof jobInfoSchema>;

    let info: JobInfo;
    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: jobInfoSchema,
        system:
          "Extract clean structured metadata from a job posting. Be concise. Skills are 5-15 short tags.",
        prompt: `${data.jobUrl ? `URL: ${data.jobUrl}\n\n` : ""}Posting:\n${descriptionText.slice(0, 12000)}`,
      });
      info = object;
      if (!info.descriptionText) info.descriptionText = descriptionText.slice(0, 1500);
    } catch (e) {
      console.warn("[smart-apply] jobInfo structured failed, using fallback", e);
      info = {
        company: "Unknown",
        role: "Unknown role",
        location: "",
        seniority: "unknown",
        requiredSkills: [],
        salaryRaw: "",
        descriptionText: descriptionText.slice(0, 1500),
      };
    }

    // Step 2: tailored pack via structured output (much more reliable than JSON in text)
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

    let pack: z.infer<typeof packSchema>;
    try {
      const { object } = await generateObject({
        model: gateway(MODEL),
        schema: packSchema,
        system:
          "You are a senior career coach. Tailor the candidate's CV to the job (ATS-friendly, ~400-600 words with sections Summary, Experience, Skills, Education). Write a strong, specific 250-320 word cover letter addressed to the company. Give an honest matchScore (0-100), matched & missing skills, and a realistic salary range based on role, location, and seniority.",
        prompt: `JOB:\nCompany: ${info.company}\nRole: ${info.role}\nLocation: ${info.location}\nSeniority: ${info.seniority}\nRequired skills: ${info.requiredSkills.join(", ")}\nSalary on posting: ${info.salaryRaw || "(not listed)"}\n\nDescription:\n${info.descriptionText}\n\nCANDIDATE CV:\n${data.cvText.slice(0, 12000)}`,
      });
      pack = object;
    } catch (e) {
      console.error("[smart-apply] pack generation failed", e);
      throw new Error(
        "The AI couldn't produce a tailored pack. Try a shorter CV or a cleaner job description.",
      );
    }


    // log usage
    try {
      await context.supabase
        .from("usage_events")
        .insert({ user_id: context.userId, feature: "smart_apply" });
    } catch (e) {
      console.warn("usage log failed", e);
    }

    return {
      fetchedFromUrl,
      job: info,
      ...pack,
    };
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
