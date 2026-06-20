import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
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

function parseJsonObject<T>(text: string): T | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

function words(text: string) {
  return Array.from(new Set(text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? []));
}

function fallbackCvReport(cvText: string) {
  const hasMetrics = /\d+%|\$\d+|\b\d+x\b|\b\d+\+/.test(cvText);
  const hasSections = /(experience|education|skills|summary|projects)/i.test(cvText);
  const atsScore = Math.min(88, Math.max(48, 50 + (hasSections ? 18 : 0) + (hasMetrics ? 12 : 0) + Math.min(8, Math.floor(cvText.length / 250))));
  return {
    atsScore,
    strengths: ["Clear role focus", "Relevant skills are visible", "Experience is easy to scan"],
    weaknesses: ["Add measurable achievements", "Use stronger action verbs", "Include a concise professional summary"],
    missingKeywords: ["impact", "metrics", "collaboration", "stakeholders", "delivery"],
    improvedCv: `Summary\nResults-focused professional with experience delivering practical, user-centered work and collaborating across teams.\n\nExperience\n${cvText}\n\nSkills\nTechnical delivery, communication, problem solving, collaboration, project execution.\n\nATS Improvements\n- Add numbers to show impact.\n- Keep job titles, tools, and keywords close to the relevant experience.\n- Use consistent headings: Summary, Experience, Education, Skills.`,
  };
}

function fallbackJobMatch(cvText: string, jobDescription: string) {
  const cvWords = words(cvText);
  const jobWords = words(jobDescription).filter((w) => !["with", "and", "the", "for", "you", "our", "will", "this"].includes(w));
  const matchedSkills = jobWords.filter((w) => cvWords.includes(w)).slice(0, 10);
  const missingSkills = jobWords.filter((w) => !cvWords.includes(w)).slice(0, 10);
  const matchScore = Math.min(92, Math.max(25, Math.round((matchedSkills.length / Math.max(8, Math.min(jobWords.length, 25))) * 100)));
  return {
    matchScore,
    matchedSkills,
    missingSkills,
    missingKeywords: missingSkills.slice(0, 8),
    recommendations: [
      "Mirror the job title and most important tools from the posting in your summary.",
      "Add 2-3 quantified bullets that prove impact for the role requirements.",
      "Move the strongest matching skills into the top third of your CV.",
    ],
    summary: `Your CV matches ${matchScore}% of the visible job keywords. Strengthen the missing keywords and add measurable proof for the most important requirements.`,
  };
}

// ---------- CV Analysis & Rewrite ----------
export const analyzeCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cvText: z.string().min(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await enforceLimit(context.supabase, context.userId, "cv_analysis");
    const gateway = getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You are an expert career coach and ATS resume reviewer. Return only valid JSON with keys: atsScore number 0-100, strengths string array, weaknesses string array, missingKeywords string array, improvedCv string. Do not use markdown fences.",
      prompt: `Analyze this CV and produce the JSON report.\n\nCV:\n${data.cvText}`,
    });
    await logUsage(context.supabase, context.userId, "cv_analysis");
    const parsed = parseJsonObject<ReturnType<typeof fallbackCvReport>>(text);
    return parsed ?? fallbackCvReport(data.cvText);
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
    const { text } = await generateText({
      model: gateway(MODEL),
      system: "You match candidates to jobs. Return only valid JSON with keys: matchScore number 0-100, matchedSkills string array, missingSkills string array, missingKeywords string array, recommendations string array, summary string. Do not use markdown fences.",
      prompt: `CV:\n${data.cvText}\n\nJOB:\n${data.jobDescription}`,
    });
    await logUsage(context.supabase, context.userId, "job_match");
    const parsed = parseJsonObject<ReturnType<typeof fallbackJobMatch>>(text);
    return parsed ?? fallbackJobMatch(data.cvText, data.jobDescription);
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
    const { text } = await generateText({
      model: gateway(MODEL),
      system: "You are a career coach creating actionable step-by-step learning roadmaps. Return only valid JSON with keys: title string, overview string, milestones array of {month number,title string,objectives string array,resources string array,project string}, keySkills string array. Do not use markdown fences.",
      prompt: `Goal: ${data.goal}\nCurrent level: ${data.currentLevel}\nTimeframe: ${data.timeframeMonths} months`,
    });
    await logUsage(context.supabase, context.userId, "roadmap");
    const parsed = parseJsonObject<{
      title: string;
      overview: string;
      milestones: Array<{ month: number; title: string; objectives: string[]; resources: string[]; project: string }>;
      keySkills: string[];
    }>(text);
    return parsed ?? {
      title: `${data.timeframeMonths}-Month ${data.goal} Roadmap`,
      overview: `A practical plan to move from ${data.currentLevel} toward ${data.goal}.`,
      keySkills: ["Core fundamentals", "Portfolio proof", "Interview readiness", "Networking"],
      milestones: Array.from({ length: Math.min(data.timeframeMonths, 6) }, (_, i) => ({
        month: i + 1,
        title: `Build month ${i + 1} momentum`,
        objectives: ["Study the most important role requirements", "Complete one visible portfolio task", "Review progress and improve weak areas"],
        resources: ["Official documentation", "Role-specific tutorials", "Practice projects"],
        project: `Create a ${data.goal}-focused portfolio piece that proves this month's skills.`,
      })),
    };
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
