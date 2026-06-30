import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeCv } from "@/lib/ai.functions";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { FileText, Sparkles, Copy, Save, Download } from "lucide-react";
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
  const [result, setResult] = useState<any>(null);

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


  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="h-7 w-7 text-primary-glow" /> CV Builder</h1>
        <p className="text-muted-foreground mt-1">Upload a CV or paste it below. We'll score it and rewrite it ATS-friendly. Your CV is saved on your <Link to="/profile" className="underline">profile</Link>.</p>
      </header>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <input type="file" accept=".txt,.md,.doc,.docx,.pdf" onChange={onFile} className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-secondary-foreground" />
          <span className="text-xs text-muted-foreground">or paste below</span>
        </div>
        <Textarea value={cv} onChange={(e) => setCv(e.target.value)} placeholder="Paste your CV text here…" className="min-h-[260px] font-mono text-sm" />
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">{cv.length.toLocaleString()} chars · stored on your profile</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => saveMut.mutate()} disabled={!cv || saveMut.isPending}>
              <Save className="h-4 w-4" /> {saveMut.isPending ? "Saving…" : "Save CV"}
            </Button>
            <Button variant="hero" onClick={run} disabled={busy}>
              <Sparkles className="h-4 w-4" /> {busy ? "Analyzing…" : "Analyze with AI"}
            </Button>
          </div>
        </div>
      </div>


      {result && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-sm text-muted-foreground">ATS Score</div>
            <div className="text-6xl font-bold text-gradient mt-2">{result.atsScore}</div>
            <div className="text-xs text-muted-foreground mt-1">/ 100</div>
          </div>
          <div className="glass-card rounded-2xl p-6 md:col-span-2 space-y-4">
            <Section title="Strengths" items={result.strengths} color="text-success" />
            <Section title="Weaknesses" items={result.weaknesses} color="text-warning" />
            <Section title="Missing keywords" items={result.missingKeywords} color="text-primary-glow" pill />
          </div>
          <div className="glass-card rounded-2xl p-6 md:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Improved CV (ATS-friendly)</h3>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(result.improvedCv); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{result.improvedCv}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color, pill }: { title: string; items: string[]; color: string; pill?: boolean }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className={`text-sm font-semibold ${color}`}>{title}</h4>
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
