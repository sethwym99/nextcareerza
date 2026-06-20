import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getGateway } from "@/lib/ai-gateway.server";

type Body = { messages?: unknown; role?: string };

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages required", { status: 400 });
        }
        const gateway = getGateway();
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: `You are a senior hiring manager conducting a realistic ${body.role || "professional"} interview.
Rules:
- Ask ONE question at a time. Wait for the answer.
- After each candidate answer, give brief constructive feedback (1-2 sentences) THEN ask the next question.
- Mix behavioral, technical, and situational questions appropriate to the role.
- After ~6 questions, give a final summary: overall feedback, strengths, areas to improve, and a score out of 10.
- Be encouraging but honest. Use markdown formatting.`,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});
