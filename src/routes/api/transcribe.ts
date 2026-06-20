import { createFileRoute } from "@tanstack/react-router";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return new Response("Audio file required", { status: 400 });
        if (file.size < 1024) return new Response("Recording was empty", { status: 400 });
        if (file.size > MAX_AUDIO_BYTES)
          return new Response("Recording is too large", { status: 413 });

        const mime = file.type.split(";")[0];
        const ext = EXT_BY_MIME[mime];
        if (!ext) return new Response("Unsupported audio format", { status: 400 });

        const upstreamForm = new FormData();
        upstreamForm.append("model", "openai/gpt-4o-mini-transcribe");
        upstreamForm.append("file", file, `answer.${ext}`);
        upstreamForm.append("stream", "true");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstreamForm,
        });

        if (!upstream.ok) {
          const body = await upstream.text().catch(() => "");
          return new Response(body || "Transcription failed", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
