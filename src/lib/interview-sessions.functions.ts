import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saveSchema = z.object({
  role: z.string().min(1).max(200),
  score: z.number().int().min(0).max(100),
  verdict: z.string().max(500).optional().default(""),
  summary: z.string().max(4000).optional().default(""),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
  questionCount: z.number().int().min(0).default(0),
  lookAwayCount: z.number().int().min(0).default(0),
});

export const saveInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("interview_sessions" as any).insert({
      user_id: context.userId,
      role: data.role,
      score: data.score,
      verdict: data.verdict,
      summary: data.summary,
      strengths: data.strengths,
      improvements: data.improvements,
      red_flags: data.redFlags,
      question_count: data.questionCount,
      look_away_count: data.lookAwayCount,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInterviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("interview_sessions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });
