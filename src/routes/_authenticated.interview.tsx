import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startInterviewSession } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({ meta: [{ title: "Interview Practice — NextHire" }] }),
  component: Page,
});

function Page() {
  const startFn = useServerFn(startInterviewSession);
  const [role, setRole] = useState("");
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/interview" }),
    onError: (e) => toast.error(e.message || "Stream error"),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function start() {
    if (role.trim().length < 2) { toast.error("Enter the role you want to practice"); return; }
    try {
      await startFn({ data: { role } });
      setStarted(true);
      await sendMessage({ text: `Please start a mock interview for a ${role} role. Begin with the first question only.` });
    } catch (e: any) { toast.error(e.message || "Failed to start"); }
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Mic className="h-7 w-7 text-primary-glow" /> Interview Practice</h1>
        <p className="text-muted-foreground mt-1">Realistic mock interviews with instant feedback.</p>
      </header>

      {!started ? (
        <div className="glass-card rounded-2xl p-8 text-center max-w-xl mx-auto">
          <Sparkles className="h-8 w-8 text-primary-glow mx-auto mb-3" />
          <h2 className="text-xl font-semibold">What role are you practicing for?</h2>
          <p className="text-muted-foreground text-sm mt-2">e.g. "Junior Data Analyst", "Senior Frontend Engineer", "Product Manager"</p>
          <div className="mt-6 flex gap-2">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role title…" onKeyDown={(e) => e.key === "Enter" && start()} />
            <Button variant="hero" onClick={start}>Start</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m) => {
              const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-secondary"}`}>
                    {text}
                  </div>
                </div>
              );
            })}
            {busy && <div className="text-xs text-muted-foreground">AI is thinking…</div>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (input.trim() && !busy) { sendMessage({ text: input }); setInput(""); } }}
            className="p-4 border-t border-border flex gap-2"
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} />
            <Button variant="hero" type="submit" disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </div>
  );
}
