import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/play-rtdn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const expected = process.env.GOOGLE_PLAY_RTDN_TOKEN;
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let envelope: any;
        try {
          envelope = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const dataB64: string | undefined = envelope?.message?.data;
        if (!dataB64) {
          // Pub/Sub liveness ping — ack so it stops retrying.
          return new Response(null, { status: 204 });
        }

        let notification: any;
        try {
          const decoded = atob(dataB64);
          notification = JSON.parse(decoded);
        } catch (e) {
          console.warn("[play-rtdn] decode failed", e);
          return new Response(null, { status: 204 });
        }

        try {
          const { handleRtdn } = await import("@/lib/play-billing.server");
          await handleRtdn(notification);
        } catch (e) {
          console.error("[play-rtdn] handler error", e);
          // Return 500 so Pub/Sub retries.
          return new Response("Error", { status: 500 });
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});
