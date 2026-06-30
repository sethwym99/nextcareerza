import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { generateRoadmap, getUsageStatus } from "@/lib/ai.functions";
import {
  Map as MapIcon,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trophy,
  RotateCcw,
  Download,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Career Roadmap — NextCareer" }] }),
  component: Page,
});

type Milestone = {
  month: number;
  title: string;
  objectives: string[];
  resources: string[];
  project: string;
};
type Roadmap = {
  title: string;
  overview: string;
  keySkills: string[];
  milestones: Milestone[];
};

const LS_KEY = "nc.roadmap.v1";

function Page() {
  const fn = useServerFn(generateRoadmap);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("beginner");
  const [months, setMonths] = useState(6);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Roadmap | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.roadmap) {
        setR(parsed.roadmap);
        setDone(parsed.done ?? {});
        setGoal(parsed.goal ?? "");
        setOpenMonth(parsed.roadmap.milestones?.[0]?.month ?? null);
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    if (!r) return;
    localStorage.setItem(LS_KEY, JSON.stringify({ roadmap: r, done, goal }));
  }, [r, done, goal]);

  async function run() {
    if (goal.length < 3) {
      toast.error("Tell us your goal");
      return;
    }
    setBusy(true);
    try {
      const out = (await fn({
        data: { goal, currentLevel: level, timeframeMonths: months },
      })) as Roadmap;
      setR(out);
      setDone({});
      setOpenMonth(out.milestones?.[0]?.month ?? null);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  const { totalSteps, completedSteps, perMonth } = useMemo(() => {
    if (!r) return { totalSteps: 0, completedSteps: 0, perMonth: {} as Record<number, { total: number; done: number }> };
    let total = 0;
    let comp = 0;
    const pm: Record<number, { total: number; done: number }> = {};
    r.milestones.forEach((m) => {
      const objs = m.objectives.length + 1; // +1 for project
      pm[m.month] = { total: objs, done: 0 };
      m.objectives.forEach((_, j) => {
        const k = `m${m.month}.o${j}`;
        total++;
        if (done[k]) {
          comp++;
          pm[m.month].done++;
        }
      });
      const pk = `m${m.month}.project`;
      total++;
      if (done[pk]) {
        comp++;
        pm[m.month].done++;
      }
    });
    return { totalSteps: total, completedSteps: comp, perMonth: pm };
  }, [r, done]);

  function toggle(key: string) {
    setDone((d) => ({ ...d, [key]: !d[key] }));
  }

  function resetProgress() {
    if (!confirm("Reset all progress?")) return;
    setDone({});
    toast.success("Progress reset");
  }

  function exportJson() {
    if (!r) return;
    const blob = new Blob([JSON.stringify({ roadmap: r, done }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap-${goal.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const overall = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <MapIcon className="h-7 w-7 text-primary-glow" /> Career Roadmap
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tell us where you want to go — then track every step.
        </p>
      </header>

      <div className="glass-card rounded-2xl p-4 md:p-6 grid md:grid-cols-[1fr_180px_120px_auto] gap-3 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your goal</label>
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Become a Data Analyst"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Current level</label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Months</label>
          <Input
            type="number"
            min={1}
            max={36}
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value) || 6)}
          />
        </div>
        <Button variant="hero" onClick={run} disabled={busy}>
          <Sparkles className="h-4 w-4" /> {busy ? "Planning…" : r ? "Regenerate" : "Build roadmap"}
        </Button>
      </div>

      {r && (
        <div className="space-y-4">
          {/* Overall progress card */}
          <div className="glass-card rounded-2xl p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl md:text-2xl font-bold">{r.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{r.overview}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="ghost" onClick={resetProgress} title="Reset">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={exportJson} title="Export">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-primary-glow" />
                  {completedSteps} of {totalSteps} steps done
                </span>
                <span className="font-semibold">{overall}%</span>
              </div>
              <Progress value={overall} className="h-2" />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {r.keySkills.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary-glow">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <ol className="space-y-3">
            {r.milestones.map((m) => {
              const pm = perMonth[m.month] ?? { total: 0, done: 0 };
              const pct = pm.total > 0 ? Math.round((pm.done / pm.total) * 100) : 0;
              const isOpen = openMonth === m.month;
              const complete = pct === 100;
              return (
                <li
                  key={m.month}
                  className={`glass-card rounded-2xl overflow-hidden transition ${
                    complete ? "ring-1 ring-success/40" : ""
                  }`}
                >
                  <button
                    onClick={() => setOpenMonth(isOpen ? null : m.month)}
                    className="w-full flex items-center gap-3 p-4 md:p-5 text-left"
                  >
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center text-sm font-bold ${
                        complete
                          ? "bg-success text-success-foreground"
                          : "bg-[image:var(--gradient-primary)] text-primary-foreground"
                      }`}
                    >
                      {complete ? <CheckCircle2 className="h-5 w-5" /> : m.month}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-primary-glow">
                        Month {m.month}
                      </div>
                      <div className="font-semibold truncate">{m.title}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 md:px-5 pb-5 pt-1 grid md:grid-cols-3 gap-5 text-sm border-t border-border/40">
                      <div className="md:col-span-1">
                        <h4 className="font-medium mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                          Objectives
                        </h4>
                        <ul className="space-y-2">
                          {m.objectives.map((o, j) => {
                            const k = `m${m.month}.o${j}`;
                            const checked = !!done[k];
                            return (
                              <li key={j}>
                                <button
                                  onClick={() => toggle(k)}
                                  className="flex gap-2 text-left w-full group"
                                >
                                  <span
                                    className={`h-5 w-5 rounded-md border grid place-items-center shrink-0 mt-0.5 transition ${
                                      checked
                                        ? "bg-success border-success text-success-foreground"
                                        : "border-border group-hover:border-primary-glow"
                                    }`}
                                  >
                                    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                  </span>
                                  <span
                                    className={
                                      checked
                                        ? "line-through text-muted-foreground"
                                        : ""
                                    }
                                  >
                                    {o}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="md:col-span-1">
                        <h4 className="font-medium mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                          Resources
                        </h4>
                        <ul className="space-y-1.5">
                          {m.resources.map((res, j) => {
                            const isUrl = /^https?:\/\//i.test(res);
                            return (
                              <li key={j} className="text-muted-foreground">
                                {isUrl ? (
                                  <a
                                    href={res}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary-glow hover:underline break-all"
                                  >
                                    {res}
                                  </a>
                                ) : (
                                  <>• {res}</>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="md:col-span-1">
                        <h4 className="font-medium mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                          Project
                        </h4>
                        <button
                          onClick={() => toggle(`m${m.month}.project`)}
                          className="flex gap-2 text-left w-full group"
                        >
                          <span
                            className={`h-5 w-5 rounded-md border grid place-items-center shrink-0 mt-0.5 transition ${
                              done[`m${m.month}.project`]
                                ? "bg-success border-success text-success-foreground"
                                : "border-border group-hover:border-primary-glow"
                            }`}
                          >
                            {done[`m${m.month}.project`] && (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span
                            className={
                              done[`m${m.month}.project`]
                                ? "line-through text-muted-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {m.project}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {overall === 100 && (
            <div className="glass-card rounded-2xl p-6 text-center bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-2" />
              <div className="font-bold text-lg">Roadmap complete 🎉</div>
              <div className="text-sm opacity-90">
                Time to update your CV and start applying.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
