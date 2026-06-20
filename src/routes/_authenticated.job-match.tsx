import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { jobMatchScore } from "@/lib/ai.functions";
import { Target, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/job-match")({
  head: () => ({ meta: [{ title: "Job Match Score — NextCareer" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(jobMatchScore);
  const [cv, setCv] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<any>(null);

  async function run() {
    if (cv.length < 20 || jd.length < 20) { toast.error("Paste both your CV and the job description"); return; }
    setBusy(true);
    try { setR(await fn({ data: { cvText: cv, jobDescription: jd } })); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  }

  const score = r?.matchScore ?? 0;
  const color = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Target className="h-7 w-7 text-primary-glow" /> Job Match Score</h1>
        <p className="text-muted-foreground mt-1">See how well your CV fits a job — and what to fix.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="text-sm font-medium">Your CV</label>
          <Textarea value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Paste your CV…" className="min-h-[240px]" />
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="text-sm font-medium">Job description</label>
          <Textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste job posting…" className="min-h-[240px]" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="hero" onClick={run} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {busy ? "Scoring…" : "Calculate match score"}
        </Button>
      </div>

      {r && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-sm text-muted-foreground">Match Score</div>
            <div className={`text-7xl font-bold mt-2 ${color}`}>{score}%</div>
          </div>
          <div className="glass-card rounded-2xl p-6 md:col-span-2">
            <p className="text-sm text-muted-foreground">{r.summary}</p>
          </div>
          <Pills title="Matched skills" items={r.matchedSkills} tone="success" />
          <Pills title="Missing skills" items={r.missingSkills} tone="warning" />
          <Pills title="Missing keywords" items={r.missingKeywords} tone="primary" />
          <div className="glass-card rounded-2xl p-6 md:col-span-3">
            <h4 className="font-semibold mb-2">Recommendations</h4>
            <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
              {r.recommendations.map((x: string, i: number) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Pills({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "primary" }) {
  if (!items?.length) return null;
  const cls = tone === "success" ? "bg-success/15 text-success" : tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary-glow";
  return (
    <div className="glass-card rounded-2xl p-6">
      <h4 className="text-sm font-semibold mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((x) => <span key={x} className={`text-xs px-2 py-1 rounded-full ${cls}`}>{x}</span>)}
      </div>
    </div>
  );
}
