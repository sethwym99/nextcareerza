import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Wand2, Save, Loader2, Briefcase, DollarSign, Target, FileText, MessageSquare, Check, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  getBaseCv,
  saveBaseCv,
  smartApply,
  saveApplicationPack,
} from "@/lib/smart-apply.functions";

export const Route = createFileRoute("/_authenticated/smart-apply")({
  head: () => ({ meta: [{ title: "Smart Apply — NextCareer" }] }),
  component: Page,
});

type Result = Awaited<ReturnType<typeof smartApply>>;

function Page() {
  const qc = useQueryClient();
  const getCv = useServerFn(getBaseCv);
  const saveCv = useServerFn(saveBaseCv);
  const apply = useServerFn(smartApply);
  const savePack = useServerFn(saveApplicationPack);

  const { data: cvData } = useQuery({
    queryKey: ["base-cv"],
    queryFn: () => getCv({ data: undefined as any }),
  });

  const [cvText, setCvText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (cvData?.baseCv && !cvText) setCvText(cvData.baseCv);
  }, [cvData, cvText]);

  const saveCvMut = useMutation({
    mutationFn: () => saveCv({ data: { cvText } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base-cv"] });
      toast.success("CV saved to your profile");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runMut = useMutation({
    mutationFn: async () => {
      const out = await apply({
        data: {
          jobUrl: jobUrl.trim() || undefined,
          jobText: jobText.trim() || undefined,
          cvText,
        },
      });
      return out;
    },
    onSuccess: (out) => {
      setResult(out);
      // auto-save CV if it changed since last save
      if (cvText && cvText !== cvData?.baseCv) saveCvMut.mutate();
      toast.success(`Match score: ${out.matchScore}%`);
    },
    onError: (e: any) => toast.error(e.message ?? "Smart Apply failed"),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!result) return;
      return savePack({
        data: {
          jobUrl: jobUrl.trim() || null,
          company: result.job.company,
          role: result.job.role,
          location: result.job.location,
          matchScore: result.matchScore,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          tailoredCv: result.tailoredCv,
          coverLetter: result.coverLetter,
          salary: result.salary
            ? {
                low: result.salary.low,
                high: result.salary.high,
                currency: result.salary.currency,
                period: result.salary.period,
              }
            : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved to your tracker");
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canRun = cvText.length > 40 && (jobUrl.trim().length > 8 || jobText.trim().length > 40);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Wand2 className="h-7 w-7 text-primary-glow" /> Smart Apply
        </h1>
        <p className="text-muted-foreground mt-1">
          Paste a job link. Get a tailored CV, cover letter, match score and salary range in
          one shot — then save the whole pack to your tracker.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Your CV
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveCvMut.mutate()}
                disabled={!cvText || saveCvMut.isPending}
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
            <Textarea
              rows={10}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV once. We'll reuse it across the app."
            />
            <p className="text-xs text-muted-foreground mt-1">
              {cvText.length} chars · stored on your profile.
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4" /> Job posting
            </label>
            <Tabs defaultValue="url">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="text">Paste text</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-2 mt-3">
                <Input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://company.com/jobs/senior-engineer"
                />
                <p className="text-xs text-muted-foreground">
                  Some sites block scraping — if it fails, paste the text instead.
                </p>
              </TabsContent>
              <TabsContent value="text" className="mt-3">
                <Textarea
                  rows={9}
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  placeholder="Paste the full job description here…"
                />
              </TabsContent>
            </Tabs>
          </div>

          <Button
            variant="hero"
            className="w-full"
            disabled={!canRun || runMut.isPending}
            onClick={() => runMut.mutate()}
          >
            {runMut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Tailoring your application…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Run Smart Apply
              </>
            )}
          </Button>
        </div>
      </div>

      {result && <ResultPanel result={result} onSave={() => saveMut.mutate()} saving={saveMut.isPending} />}

      {!result && (
        <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
          Already tracking applications?{" "}
          <Link to="/tracker" className="text-primary-glow inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" /> Open tracker
          </Link>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  result,
  onSave,
  saving,
}: {
  result: Result;
  onSave: () => void;
  saving: boolean;
}) {
  const score = result.matchScore ?? 0;
  const scoreColor =
    score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const salary = result.salary;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Match score
          </div>
          <div className={`text-4xl font-bold mt-1 ${scoreColor}`}>{score}%</div>
          <div className="text-xs text-muted-foreground mt-1">
            {result.job.company} · {result.job.role}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Salary estimate
          </div>
          {salary && salary.high > 0 ? (
            <>
              <div className="text-2xl font-bold mt-1">
                {fmt(salary.low, salary.currency)} – {fmt(salary.high, salary.currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                per {salary.period} · confidence {salary.confidence}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">Not enough data.</div>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4 flex flex-col">
          <div className="text-xs text-muted-foreground">Save to tracker</div>
          <p className="text-xs text-muted-foreground mt-1 flex-1">
            Adds this job + saves the tailored CV and letter so you can reopen them later.
          </p>
          <Button variant="hero" size="sm" className="mt-3" onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save pack
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-success" /> Matched skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.length === 0 ? (
              <span className="text-xs text-muted-foreground">None detected.</span>
            ) : (
              result.matchedSkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <X className="h-4 w-4 text-destructive" /> Missing skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.missingSkills.length === 0 ? (
              <span className="text-xs text-muted-foreground">Nothing big missing 🎉</span>
            ) : (
              result.missingSkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="cv" className="glass-card rounded-2xl p-5">
        <TabsList>
          <TabsTrigger value="cv">
            <FileText className="h-3.5 w-3.5" /> Tailored CV
          </TabsTrigger>
          <TabsTrigger value="letter">
            <MessageSquare className="h-3.5 w-3.5" /> Cover letter
          </TabsTrigger>
          <TabsTrigger value="reco">Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="cv" className="mt-4">
          <CopyBlock text={result.tailoredCv} />
        </TabsContent>
        <TabsContent value="letter" className="mt-4">
          <CopyBlock text={result.coverLetter} />
        </TabsContent>
        <TabsContent value="reco" className="mt-4">
          <ul className="space-y-2 text-sm">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Sparkles className="h-4 w-4 text-primary-glow shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CopyBlock({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success("Copied");
          }}
        >
          Copy
        </Button>
      </div>
      <pre className="whitespace-pre-wrap text-sm font-sans bg-secondary/40 rounded-xl p-4 max-h-[600px] overflow-auto">
        {text}
      </pre>
    </div>
  );
}

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}
