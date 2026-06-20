import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateRoadmap } from "@/lib/ai.functions";
import { Map, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Career Roadmap — NextHire" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(generateRoadmap);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("beginner");
  const [months, setMonths] = useState(6);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<any>(null);

  async function run() {
    if (goal.length < 3) { toast.error("Tell us your goal"); return; }
    setBusy(true);
    try { setR(await fn({ data: { goal, currentLevel: level, timeframeMonths: months } })); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><Map className="h-7 w-7 text-primary-glow" /> Career Roadmap</h1>
        <p className="text-muted-foreground mt-1">Tell us where you want to go. We'll plan the route.</p>
      </header>

      <div className="glass-card rounded-2xl p-6 grid md:grid-cols-[1fr_180px_140px_auto] gap-3 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your goal</label>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Become a Data Analyst" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Current level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Months</label>
          <Input type="number" min={1} max={36} value={months} onChange={(e) => setMonths(parseInt(e.target.value) || 6)} />
        </div>
        <Button variant="hero" onClick={run} disabled={busy}><Sparkles className="h-4 w-4" /> {busy ? "Planning…" : "Build roadmap"}</Button>
      </div>

      {r && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-2xl font-bold">{r.title}</h2>
            <p className="text-muted-foreground mt-2">{r.overview}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {r.keySkills.map((s: string) => <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary-glow">{s}</span>)}
            </div>
          </div>

          <ol className="space-y-3">
            {r.milestones.map((m: any, i: number) => (
              <li key={i} className="glass-card rounded-2xl p-6 relative">
                <div className="absolute -left-3 top-6 hidden md:grid place-items-center h-6 w-6 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground text-xs font-bold">{m.month}</div>
                <div className="text-xs uppercase tracking-wider text-primary-glow">Month {m.month}</div>
                <h3 className="text-lg font-semibold mt-1">{m.title}</h3>
                <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Objectives</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {m.objectives.map((o: string, j: number) => <li key={j} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /><span>{o}</span></li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Resources</h4>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                      {m.resources.map((o: string, j: number) => <li key={j}>{o}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Project</h4>
                    <p className="text-muted-foreground">{m.project}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
