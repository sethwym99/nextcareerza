import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, streamText, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGateway } from "./ai-gateway.server";

const FREE_LIMIT = 3;

const FreeFeatures = ["cv_analysis", "interview_session"] as const;
type FreeFeature = (typeof FreeFeatures)[number];

async function enforceLimit(
  supabase: any,
  userId: string,
  feature: string,
) {
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const plan = profile?.plan ?? "free";
  if (plan === "premium") return;

  // Premium-only features
  const premiumOnly = ["cover_letter"];
  if (premiumOnly.includes(feature)) {
    throw new Error("This feature is available on Premium. Upgrade to unlock unlimited cover letters.");
  }

  if (!FreeFeatures.includes(feature as FreeFeature)) return; // unlimited for others on free

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", monthStart.toISOString());

  if ((count ?? 0) >= FREE_LIMIT) {
    throw new Error(`Free plan limit reached for this month (${FREE_LIMIT}). Upgrade to Premium for unlimited access.`);
  }
}

async function logUsage(supabase: any, userId: string, feature: string) {
  await supabase.from("usage_events").insert({ user_id: userId, feature });
}

const MODEL = "google/gemini-3-flash-preview";

// ---------- CV Analysis & Rewrite ----------
export const analyzeCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cvText: z.string().min(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceLimit(context.supabase, context.userId, "cv_analysis");
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      system:
        "You are an expert career coach and ATS resume reviewer. Score CVs objectively, list strengths, weaknesses, missing ATS keywords, and provide a clean, ATS-friendly rewritten version in plain text using standard section headings (Summary, Experience, Education, Skills, Certifications).",
      prompt: `Analyze this CV and produce a JSON report.\n\nCV:\n${data.cvText}`,
      output: Output.object({
        schema: z.object({
          atsScore: z.number().min(0).max(100),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          missingKeywords: z.array(z.string()),
          improvedCv: z.string(),
        }),
      }),
    });
    await logUsage(context.supabase, context.userId, "cv_analysis");
    return output;
  });

// ---------- Cover Letter ----------
export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      jobDescription: z.string().min(20),
      cvText: z.string().optional().default(""),
      tone: z.enum(["professional", "friendly", "enthusiastic", "concise"]).default("professional"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceLimit(context.supabase, context.userId, "cover_letter");
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      system: "You write tailored, ATS-friendly cover letters. Keep them ~250-350 words, specific, with strong opening and clear CTA.",
      prompt: `Tone: ${data.tone}\n\nJob description:\n${data.jobDescription}\n\nCandidate CV/notes:\n${data.cvText || "(not provided — write a generic but compelling letter)"}\n\nReturn ONLY the cover letter text.`,
    });
    await logUsage(context.supabase, context.userId, "cover_letter");
    return { letter: text };
  });

// ---------- Job Match Score ----------
export const jobMatchScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cvText: z.string().min(20), jobDescription: z.string().min(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceLimit(context.supabase, context.userId, "job_match");
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      system: "You match candidates to jobs. Be strict and concrete. Identify missing skills, missing keywords, and recommendations to close the gap.",
      prompt: `CV:\n${data.cvText}\n\nJOB:\n${data.jobDescription}`,
      output: Output.object({
        schema: z.object({
          matchScore: z.number().min(0).max(100),
          matchedSkills: z.array(z.string()),
          missingSkills: z.array(z.string()),
          missingKeywords: z.array(z.string()),
          recommendations: z.array(z.string()),
          summary: z.string(),
        }),
      }),
    });
    await logUsage(context.supabase, context.userId, "job_match");
    return output;
  });

// ---------- Career Roadmap ----------
export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      goal: z.string().min(3),
      currentLevel: z.string().optional().default("beginner"),
      timeframeMonths: z.number().int().min(1).max(36).default(6),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await enforceLimit(context.supabase, context.userId, "roadmap");
    const gateway = getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      system: "You are a career coach creating actionable step-by-step learning roadmaps with concrete resources, projects, and milestones.",
      prompt: `Goal: ${data.goal}\nCurrent level: ${data.currentLevel}\nTimeframe: ${data.timeframeMonths} months`,
      output: Output.object({
        schema: z.object({
          title: z.string(),
          overview: z.string(),
          milestones: z.array(z.object({
            month: z.number(),
            title: z.string(),
            objectives: z.array(z.string()),
            resources: z.array(z.string()),
            project: z.string(),
          })),
          keySkills: z.array(z.string()),
        }),
      }),
    });
    await logUsage(context.supabase, context.userId, "roadmap");
    return output;
  });

// ---------- Interview start (logs a session) ----------
export const startInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ role: z.string().min(2) }).parse(d))
  .handler(async ({ context, data }) => {
    await enforceLimit(context.supabase, context.userId, "interview_session");
    await logUsage(context.supabase, context.userId, "interview_session");
    return { ok: true, role: data.role };
  });

// ---------- Usage status ----------
export const getUsageStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("plan,full_name,email").eq("id", context.userId).maybeSingle();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const features = ["cv_analysis", "interview_session", "cover_letter", "job_match", "roadmap"];
    const counts: Record<string, number> = {};
    for (const f of features) {
      const { count } = await context.supabase
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("feature", f)
        .gte("created_at", monthStart.toISOString());
      counts[f] = count ?? 0;
    }
    return { profile: profile ?? { plan: "free" }, counts, freeLimit: FREE_LIMIT };
  });
