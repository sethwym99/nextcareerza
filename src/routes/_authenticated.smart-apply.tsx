import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sparkles,
  Wand2,
  Save,
  Loader2,
  Search,
  ExternalLink,
  FileText,
  MessageSquare,
  Check,
  X,
  Target,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBaseCv,
  saveBaseCv,
  searchJobs,
  tailorForJob,
  saveApplicationPack,
  listShortlist,
  addToShortlist,
  removeFromShortlist,
  type JobHit,
} from "@/lib/smart-apply.functions";

export const Route = createFileRoute("/_authenticated/smart-apply")({
  head: () => ({ meta: [{ title: "Smart Apply — NextCareer" }] }),
  component: Page,
});

type TailorResult = Awaited<ReturnType<typeof tailorForJob>>;

function Page() {
  const qc = useQueryClient();
  const getCv = useServerFn(getBaseCv);
  const saveCv = useServerFn(saveBaseCv);
  const runSearch = useServerFn(searchJobs);
  const runTailor = useServerFn(tailorForJob);
  const savePack = useServerFn(saveApplicationPack);

  const { data: cvData } = useQuery({
    queryKey: ["base-cv"],
    queryFn: () => getCv({ data: undefined as any }),
  });

  const [cvText, setCvText] = useState("");
  const [cvOpen, setCvOpen] = useState(false);
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobs, setJobs] = useState<JobHit[] | null>(null);
  const [selected, setSelected] = useState<JobHit | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);

  useEffect(() => {
    if (cvData?.baseCv && !cvText) setCvText(cvData.baseCv);
  }, [cvData, cvText]);

  const saveCvMut = useMutation({
    mutationFn: () => saveCv({ data: { cvText } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base-cv"] });
      toast.success("CV saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const searchMut = useMutation({
    mutationFn: async () => {
      const out = await runSearch({
        data: { role: role.trim(), location: location.trim(), seniority: seniority.trim() },
      });
      return out.jobs;
    },
    onSuccess: (out) => {
      setJobs(out);
      setSelected(null);
      setResult(null);
      if (out.length === 0) toast.info("No jobs found. Try a broader role or location.");
    },
    onError: (e: any) => toast.error(e.message ?? "Search failed"),
  });

  const tailorMut = useMutation({
    mutationFn: async (job: JobHit) => {
      if (cvText.length < 40) throw new Error("Add your CV first (top of page).");
      return runTailor({
        data: {
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          jobSnippet: job.snippet || `${job.title} at ${job.company}`,
          jobUrl: job.url,
          cvText,
        },
      });
    },
    onSuccess: (out) => {
      setResult(out);
      if (cvText && cvText !== cvData?.baseCv) saveCvMut.mutate();
      toast.success(`Match score: ${out.matchScore}%`);
    },
    onError: (e: any) => toast.error(e.message ?? "Tailoring failed"),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!result || !selected) return;
      return savePack({
        data: {
          jobUrl: selected.url ?? null,
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

  const canSearch = role.trim().length > 1 && !searchMut.isPending;

  function pick(job: JobHit) {
    setSelected(job);
    setResult(null);
    tailorMut.mutate(job);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary-glow" /> Smart Apply
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search live jobs, then auto-tailor your CV + cover letter for any one of them.
        </p>
      </header>

      {/* CV drawer */}
      <div className="glass-card rounded-2xl">
        <button
          onClick={() => setCvOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> Your CV
            <span className="text-xs text-muted-foreground">
              {cvText.length > 0 ? `${cvText.length} chars saved` : "not set yet"}
            </span>
          </span>
          {cvOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {cvOpen && (
          <div className="px-4 pb-4 space-y-2">
            <Textarea
              rows={8}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV once. We'll reuse it across the app."
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveCvMut.mutate()}
                disabled={!cvText || saveCvMut.isPending}
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="glass-card rounded-2xl p-4 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
        <Input
          placeholder="Role (e.g. Frontend Developer)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSearch && searchMut.mutate()}
        />
        <Input
          placeholder="Location (optional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSearch && searchMut.mutate()}
        />
        <Input
          placeholder="Seniority"
          value={seniority}
          onChange={(e) => setSeniority(e.target.value)}
          className="sm:w-32"
        />
        <Button
          variant="hero"
          onClick={() => searchMut.mutate()}
          disabled={!canSearch}
        >
          {searchMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-4">
        {/* Results list */}
        <div className="space-y-2">
          {!jobs && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Search above to see live job listings.
            </div>
          )}
          {jobs && jobs.length === 0 && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              No jobs found for that query.
            </div>
          )}
          {jobs?.map((j) => (
            <button
              key={j.id}
              onClick={() => pick(j)}
              className={`w-full text-left glass-card rounded-2xl p-4 transition border ${
                selected?.id === j.id
                  ? "border-primary-glow/70"
                  : "border-transparent hover:border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{j.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {j.company} {j.location && `· ${j.location}`}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{j.source}</span>
              </div>
              {j.snippet && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{j.snippet}</p>
              )}
              <a
                href={j.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-primary-glow inline-flex items-center gap-1 mt-2"
              >
                <ExternalLink className="h-3 w-3" /> Open posting
              </a>
            </button>
          ))}
        </div>

        {/* Tailor pane */}
        <div className="space-y-3">
          {!selected && (
            <div className="glass-card rounded-2xl p-8 text-sm text-muted-foreground text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary-glow" />
              Pick a job on the left to auto-tailor your CV and cover letter.
            </div>
          )}
          {selected && tailorMut.isPending && (
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Tailoring for {selected.title} at {selected.company}…
            </div>
          )}
          {selected && result && (
            <ResultPanel
              result={result}
              onSave={() => saveMut.mutate()}
              saving={saveMut.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onSave,
  saving,
}: {
  result: TailorResult;
  onSave: () => void;
  saving: boolean;
}) {
  const score = result.matchScore ?? 0;
  const scoreColor =
    score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const salary = result.salary;

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> Match score
          </div>
          <div className={`text-3xl font-bold mt-1 ${scoreColor}`}>{score}%</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {result.job.company} · {result.job.role}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Salary
          </div>
          {salary && salary.high > 0 ? (
            <>
              <div className="text-lg font-bold mt-1">
                {fmt(salary.low, salary.currency)} – {fmt(salary.high, salary.currency)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                per {salary.period} · {salary.confidence} conf.
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">Not enough data.</div>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4 flex flex-col">
          <div className="text-xs text-muted-foreground">Save</div>
          <Button variant="hero" size="sm" className="mt-auto" onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save pack
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-success" /> Matched
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.length === 0 ? (
              <span className="text-xs text-muted-foreground">None detected.</span>
            ) : (
              result.matchedSkills.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
            <X className="h-4 w-4 text-destructive" /> Missing
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

      <Tabs defaultValue="cv" className="glass-card rounded-2xl p-4">
        <TabsList>
          <TabsTrigger value="cv">
            <FileText className="h-3.5 w-3.5" /> CV
          </TabsTrigger>
          <TabsTrigger value="letter">
            <MessageSquare className="h-3.5 w-3.5" /> Cover letter
          </TabsTrigger>
          <TabsTrigger value="reco">Tips</TabsTrigger>
        </TabsList>
        <TabsContent value="cv" className="mt-3">
          <CopyBlock text={result.tailoredCv} />
        </TabsContent>
        <TabsContent value="letter" className="mt-3">
          <CopyBlock text={result.coverLetter} />
        </TabsContent>
        <TabsContent value="reco" className="mt-3">
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
