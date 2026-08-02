import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeCv, type AtsReport, type AtsSection } from "@/lib/ai.functions";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { FileText, Sparkles, Copy, Save, Download, Check, AlertTriangle, Wand2, Type, AlignLeft } from "lucide-react";
import { exportResumePdf } from "@/lib/resume-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cv-builder")({
  head: () => ({ meta: [{ title: "CV Builder — NextCareer" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(analyzeCv);
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);
  const [cv, setCv] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AtsReport | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });
  useEffect(() => {
    if (profile && !hydrated) {
      if (profile.baseCv) setCv(profile.baseCv);
      setHydrated(true);
    }
  }, [profile, hydrated]);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { baseCv: cv } }),
    onSuccess: () => toast.success("Saved to your profile"),
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCv(text);
  }

  async function run() {
    if (cv.trim().length < 20) { toast.error("Paste your CV first (min 20 chars)"); return; }
    setBusy(true);
    try {
      const r = await fn({ data: { cvText: cv } });
      setResult(r);
      // auto-save the base CV when it changes
      if (cv !== (profile?.baseCv ?? "")) saveMut.mutate();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  }

  function applySectionRewrite(section: AtsSection) {
    if (!section.original) return;
    // Replace the first occurrence of the original snippet with the rewritten version.
    const next = cv.includes(section.original)
      ? cv.replace(section.original, section.rewritten)
      : cv + "\n\n" + section.rewritten;
    setCv(next);
    toast.success(`${section.name} rewrite applied`);
  }

  function applyAllRewrites() {
    if (!result?.sections.length) return;
    let next = cv;
    for (const s of result.sections) {
      if (s.original && next.includes(s.original)) {
        next = next.replace(s.original, s.rewritten);
      } else if (s.rewritten) {
        next += "\n\n" + s.rewritten;
      }
    }
    setCv(next);
    toast.success("All rewrites applied");
  }

  const scoreColor = result ? scoreColorClass(result.atsScore) : "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="h-7 w-7 text-primary-glow" /> CV Builder</h1>
        <p className="text-muted-foreground mt-1">Upload a CV or paste it below. We'll score it, find ATS issues, and let you rewrite any section with AI. Your CV is saved on your <Link to="/profile" className="underline">profile</Link>.</p>
      </header>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input type="file" accept=".txt,.md,.doc,.docx,.pdf" onChange={onFile} className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-secondary-foreground" />
          <span className="text-xs text-muted-foreground">or paste below</span>
        </div>
        <Textarea value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Paste your CV text here…" className="min-h-[260px] font-mono text-sm" />
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">{cv.length.toLocaleString()} chars · stored on your profile</span>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => saveMut.mutate()} disabled={!cv || saveMut.isPending}>
              <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving…" : "Save CV"}
            </Button>
            <Button variant="outline" onClick={() => { if (!cv.trim()) { toast.error("Nothing to export"); return; } exportResumePdf(cv, "resume.pdf"); }} disabled={!cv}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Button variant="hero" onClick={run} disabled={busy}>
              <Sparkles className="h-4 w-4" /> {busy ? "Analyzing…" : "Analyze with AI"}
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-5">
          {/* Top row: score + quick stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="text-sm text-muted-foreground">ATS Score</div>
              <div className={`text-6xl font-bold mt-2 ${scoreColor}`}>{result.atsScore}</div>
              <div className="text-xs text-muted-foreground mt-1">/ 100</div>
              <div className="mt-3 text-xs font-medium px-2 py-1 rounded-full bg-secondary inline-block">
                {result.atsScore >= 80 ? "Great" : result.atsScore >= 60 ? "Good" : "Needs work"}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-6 md:col-span-2 space-y-4">
              <Section title="Strengths" items={result.strengths} color="text-success" icon={Check} />
              <Section title="Weaknesses" items={result.weaknesses} color="text-warning" icon={AlertTriangle} />
              <Section title="Missing keywords" items={result.missingKeywords} color="text-primary-glow" pill />
            </div>
          </div>

          {/* Readability + formatting */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Type className="h-4 w-4 text-primary-glow" /> Readability
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="text-xs text-muted-foreground">Words</div>
                  <div className="font-semibold">{result.readability.wordCount}</div>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <div className="text-xs text-muted-foreground">Bullet ratio</div>
                  <div className="font-semibold">{Math.round(result.readability.bulletRatio * 100)}%</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{result.readability.suggestion}</p>
            </div>

            {(result.formattingIssues.length > 0 || result.actionVerbs.length > 0) && (
              <div className="glass-card rounded-2xl p-5 space-y-3">
                {result.formattingIssues.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlignLeft className="h-4 w-4 text-warning" /> Formatting issues
                    </div>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {result.formattingIssues.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </>
                )}
                {result.actionVerbs.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold mt-3">
                      <Wand2 className="h-4 w-4 text-primary-glow" /> Stronger verbs
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.actionVerbs.map((v) => (
                        <span key={v.weak + v.strong} className="text-xs px-2 py-1 rounded-full bg-secondary inline-flex items-center gap-1">
                          <span className="line-through opacity-60">{v.weak}</span>
                          <span>→</span>
                          <span className="font-medium">{v.strong}</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section-level rewrites */}
          {result.sections.length > 0 && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary-glow" /> Section rewrites
                </h3>
                <Button variant="outline" size="sm" onClick={applyAllRewrites}>
                  <Sparkles className="h-3.5 w-3.5" /> Apply all
                </Button>
              </div>
              <div className="space-y-3">
                {result.sections.map((s, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold">{s.name}</h4>
                      <Button variant="hero" size="sm" onClick={() => applySectionRewrite(s)}>
                        <Wand2 className="h-3.5 w-3.5" /> Apply rewrite
                      </Button>
                    </div>
                    {s.issues.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                        {s.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                      </ul>
                    )}
                    <div className="grid md:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-secondary/40 p-3">
                        <div className="text-muted-foreground mb-1">Original</div>
                        <div className="whitespace-pre-wrap font-mono opacity-80 line-clamp-6">{s.original}</div>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-3">
                        <div className="text-primary-glow mb-1">Rewritten</div>
                        <div className="whitespace-pre-wrap font-mono line-clamp-6">{s.rewritten}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full improved CV */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="font-semibold">Improved CV (ATS-friendly)</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(result.improvedCv); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportResumePdf(result.improvedCv, "resume-improved.pdf")}>
                  <Download className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{result.improvedCv}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color, pill, icon: Icon }: { title: string; items: string[]; color: string; pill?: boolean; icon?: React.ElementType }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className={`text-sm font-semibold ${color} flex items-center gap-1.5`}>
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h4>
      {pill ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((x) => <span key={x} className="text-xs px-2 py-1 rounded-full bg-secondary">{x}</span>)}
        </div>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
          {items.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

function scoreColorClass(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}
