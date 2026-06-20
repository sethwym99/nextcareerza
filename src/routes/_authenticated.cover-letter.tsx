import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateCoverLetter } from "@/lib/ai.functions";
import { MessageSquare, Sparkles, Copy, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cover-letter")({
  head: () => ({ meta: [{ title: "Cover Letter — NextHire" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(generateCoverLetter);
  const [jd, setJd] = useState("");
  const [cv, setCv] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "enthusiastic" | "concise">("professional");
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState("");

  async function run() {
    if (jd.trim().length < 20) { toast.error("Paste the job description"); return; }
    setBusy(true);
    try {
      const r = await fn({ data: { jobDescription: jd, cvText: cv, tone } });
      setLetter(r.letter);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><MessageSquare className="h-7 w-7 text-primary-glow" /> Cover Letter</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">Tailored, ATS-friendly cover letter in seconds. <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning"><Crown className="h-3 w-3" /> Premium</span></p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="text-sm font-medium">Job description</label>
          <Textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste job posting…" className="min-h-[240px]" />
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="text-sm font-medium">Your CV / background (optional)</label>
          <Textarea value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Paste your CV or key highlights…" className="min-h-[240px]" />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Tone:</span>
          <Select value={tone} onValueChange={(v) => setTone(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="hero" onClick={run} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {busy ? "Writing…" : "Generate cover letter"}
        </Button>
      </div>

      {letter && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Your cover letter</h3>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(letter); toast.success("Copied"); }}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{letter}</pre>
        </div>
      )}
    </div>
  );
}
