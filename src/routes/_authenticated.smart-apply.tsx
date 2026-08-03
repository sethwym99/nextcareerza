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
  Bell,
  BellRing,
  Play,
  Mail,
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
  estimateSalaries,
  estimateMatchScores,
  trackApplication,
  type JobHit,
  type SalaryEstimate,
  type MatchScoreEstimate,
} from "@/lib/smart-apply.functions";
import {
  saveJobSearch,
  listSavedSearches,
  deleteSavedSearch,
  toggleSavedSearch,
  runJobSearchAlert,
  getPendingJobAlerts,
  markJobAlertsNotified,
  type SavedSearch,
  type AlertedJob,
} from "@/lib/job-alerts.functions";
import { scheduleJobAlertNotifications } from "@/lib/notifications";
import { isNativeApp } from "@/lib/platform";


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
  const runListShortlist = useServerFn(listShortlist);
  const runAddShortlist = useServerFn(addToShortlist);
  const runRemoveShortlist = useServerFn(removeFromShortlist);
  const runEstimateSalaries = useServerFn(estimateSalaries);
  const runEstimateMatchScores = useServerFn(estimateMatchScores);

  const runSaveSearch = useServerFn(saveJobSearch);
  const runListSearches = useServerFn(listSavedSearches);
  const runDeleteSearch = useServerFn(deleteSavedSearch);
  const runToggleSearch = useServerFn(toggleSavedSearch);
  const runRefreshSearch = useServerFn(runJobSearchAlert);
  const runGetPendingAlerts = useServerFn(getPendingJobAlerts);
  const runMarkNotified = useServerFn(markJobAlertsNotified);
  const runTrackApplication = useServerFn(trackApplication);

  const { data: cvData } = useQuery({
    queryKey: ["base-cv"],
    queryFn: () => getCv({ data: undefined as any }),
  });

  const { data: shortlistData } = useQuery({
    queryKey: ["shortlist"],
    queryFn: () => runListShortlist({ data: undefined as any }),
  });
  const shortlistUrls = new Set((shortlistData?.jobs ?? []).map((j: any) => j.job_url));

  const [cvText, setCvText] = useState("");
  const [cvOpen, setCvOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "shortlist" | "alerts">("search");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [jobs, setJobs] = useState<JobHit[] | null>(null);
  const [selected, setSelected] = useState<JobHit | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [salaryMap, setSalaryMap] = useState<Record<string, SalaryEstimate>>({});
  const [matchMap, setMatchMap] = useState<Record<string, MatchScoreEstimate>>({});

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertedJob[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<"daily" | "weekly">("daily");


  const shortlistMut = useMutation({
    mutationFn: async (job: JobHit) => {
      if (shortlistUrls.has(job.url)) {
        await runRemoveShortlist({ data: { jobUrl: job.url } });
        return "removed" as const;
      }
      await runAddShortlist({
        data: {
          jobUrl: job.url,
          title: job.title,
          company: job.company,
          location: job.location || "",
          snippet: job.snippet || "",
          source: job.source || "",
        },
      });
      return "added" as const;
    },
    onSuccess: (kind) => {
      qc.invalidateQueries({ queryKey: ["shortlist"] });
      toast.success(kind === "added" ? "Added to shortlist" : "Removed from shortlist");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });


  useEffect(() => {
    if (cvData?.baseCv && !cvText) setCvText(cvData.baseCv);
  }, [cvData, cvText]);

  useEffect(() => {
    let cancelled = false;
    runListSearches({ data: undefined as any })
      .then((res) => {
        if (!cancelled) setSavedSearches(res.searches ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [runListSearches, tab]);

  useEffect(() => {
    let cancelled = false;
    runGetPendingAlerts({ data: undefined as any })
      .then((res) => {
        if (!cancelled) setPendingAlerts(res.alerts ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [runGetPendingAlerts]);

  useEffect(() => {
    if (pendingAlerts.length === 0) return;
    scheduleJobAlertNotifications(
      pendingAlerts.map((a) => ({ id: a.id, title: a.title, company: a.company })),
    ).catch(() => {});
    runMarkNotified({ data: { ids: pendingAlerts.map((a) => a.id) } }).catch(() => {});
  }, [pendingAlerts, runMarkNotified]);

  const saveCvMut = useMutation({
    mutationFn: () => saveCv({ data: { cvText } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["base-cv"] });
      toast.success("CV saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveSearchMut = useMutation({
    mutationFn: () =>
      runSaveSearch({
        data: {
          role: role.trim(),
          location: location.trim(),
          seniority: seniority.trim(),
          frequency: alertFrequency,
        },
      }),
    onSuccess: async () => {
      const res = await runListSearches({ data: undefined as any });
      setSavedSearches(res.searches ?? []);
      setAlertOpen(false);
      toast.success("Job alert saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save alert"),
  });

  const deleteSearchMut = useMutation({
    mutationFn: (id: string) => runDeleteSearch({ data: { id } }),
    onSuccess: async () => {
      const res = await runListSearches({ data: undefined as any });
      setSavedSearches(res.searches ?? []);
      toast.success("Alert removed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove alert"),
  });

  const toggleSearchMut = useMutation({
    mutationFn: (id: string) => runToggleSearch({ data: { id } }),
    onSuccess: async () => {
      const res = await runListSearches({ data: undefined as any });
      setSavedSearches(res.searches ?? []);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update alert"),
  });

  const refreshSearchMut = useMutation({
    mutationFn: (id: string) => runRefreshSearch({ data: { id } }),
    onSuccess: (res) => {
      if (res.newJobs && res.newJobs.length > 0) {
        setJobs(res.newJobs);
        setTab("search");
        toast.success(`Found ${res.newJobs.length} new match${res.newJobs.length === 1 ? "" : "es"}`);
      } else {
        toast.info("No new matches right now.");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Refresh failed"),
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
      setSalaryMap({});
      setMatchMap({});
      if (out.length === 0) {
        toast.info("No jobs found. Try a broader role or location.");
        return;
      }
      // Fire-and-forget salary estimates
      runEstimateSalaries({
        data: {
          seniority: seniority.trim(),
          location: location.trim(),
          jobs: out.map((j) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
          })),
        },
      })
        .then((r) => {
          const map: Record<string, SalaryEstimate> = {};
          for (const e of r.estimates) map[e.id] = e;
          setSalaryMap(map);
        })
        .catch(() => {});

      // Fire-and-forget match score estimates (requires CV)
      if (cvText && cvText.length >= 40) {
        runEstimateMatchScores({
          data: {
            cvText,
            jobs: out.map((j) => ({
              id: j.id,
              title: j.title,
              company: j.company,
              location: j.location,
              snippet: j.snippet,
            })),
          },
        })
          .then((r) => {
            const map: Record<string, MatchScoreEstimate> = {};
            for (const s of r.scores) map[s.id] = s;
            setMatchMap(map);
          })
          .catch(() => {});
      }
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

  const trackMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a job first");
      return runTrackApplication({
        data: {
          jobUrl: selected.url,
          company: selected.company,
          role: selected.title,
          location: selected.location,
        },
      });
    },
    onSuccess: () => {
      toast.success("Added to tracker");
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to track"),
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

      {/* Tabs: Search / Shortlist / Alerts */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("search")}
          className={`text-xs px-3 py-1.5 rounded-full border ${tab === "search" ? "bg-primary/20 border-primary-glow/60" : "border-border text-muted-foreground"}`}
        >
          <Search className="h-3 w-3 inline mr-1" /> Search
        </button>
        <button
          onClick={() => setTab("shortlist")}
          className={`text-xs px-3 py-1.5 rounded-full border ${tab === "shortlist" ? "bg-primary/20 border-primary-glow/60" : "border-border text-muted-foreground"}`}
        >
          <Bookmark className="h-3 w-3 inline mr-1" /> Shortlist ({shortlistData?.jobs?.length ?? 0})
        </button>
        <button
          onClick={() => setTab("alerts")}
          className={`text-xs px-3 py-1.5 rounded-full border ${tab === "alerts" ? "bg-primary/20 border-primary-glow/60" : "border-border text-muted-foreground"}`}
        >
          <Bell className="h-3 w-3 inline mr-1" /> Alerts ({savedSearches.length})
        </button>
      </div>

      {/* Search bar */}
      {tab === "search" && (
        <div className="space-y-2">
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
            <Button variant="hero" onClick={() => searchMut.mutate()} disabled={!canSearch}>
              {searchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
          {alertOpen ? (
            <div className="glass-card rounded-2xl p-3 flex flex-wrap items-center gap-2">
              <BellRing className="h-4 w-4 text-primary-glow" />
              <span className="text-sm">Save alert for</span>
              <span className="text-sm font-semibold truncate max-w-[12rem]">
                {role.trim() || "this search"}
              </span>
              <select
                value={alertFrequency}
                onChange={(e) => setAlertFrequency(e.target.value as "daily" | "weekly")}
                className="text-sm bg-secondary rounded-md px-2 py-1 border border-border"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => setAlertOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="hero"
                onClick={() => saveSearchMut.mutate()}
                disabled={!role.trim() || saveSearchMut.isPending}
              >
                {saveSearchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAlertOpen(true)}
                disabled={!role.trim()}
              >
                <Bell className="h-3.5 w-3.5 mr-1" /> Save alert
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] gap-4">
        {/* Results / Shortlist list */}
        <div className="space-y-2">
          {tab === "search" && !jobs && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Search above to see live job listings.
            </div>
          )}
          {tab === "search" && jobs && jobs.length === 0 && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              No jobs found for that query.
            </div>
          )}
          {tab === "search" &&
            jobs?.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                active={selected?.id === j.id}
                shortlisted={shortlistUrls.has(j.url)}
                salary={salaryMap[j.id]}
                match={matchMap[j.id]}
                onPick={() => pick(j)}
                onToggleShortlist={() => shortlistMut.mutate(j)}
              />
            ))}

          {tab === "shortlist" && (shortlistData?.jobs?.length ?? 0) === 0 && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Save jobs from Search to build your shortlist.
            </div>
          )}
          {tab === "shortlist" &&
            (shortlistData?.jobs ?? []).map((s: any) => {
              const j: JobHit = {
                id: s.id,
                title: s.title,
                company: s.company,
                location: s.location ?? "",
                url: s.job_url,
                snippet: s.snippet ?? "",
                source: s.source ?? "",
              };
              return (
                <JobCard
                  key={s.id}
                  job={j}
                  active={selected?.url === j.url}
                  shortlisted
                  onPick={() => pick(j)}
                  onToggleShortlist={() => shortlistMut.mutate(j)}
                />
              );
            })}

          {tab === "alerts" && savedSearches.length === 0 && (
            <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Save a search as an alert to get notified about new matches.
            </div>
          )}
          {tab === "alerts" && savedSearches.map((s) => (
            <div
              key={s.id}
              className="glass-card rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{s.role}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.location ? `${s.location} · ` : ""}
                    {s.seniority ? `${s.seniority} · ` : ""}
                    {s.frequency}
                  </div>
                </div>
                <button
                  onClick={() => toggleSearchMut.mutate(s.id)}
                  className={`text-xs px-2 py-0.5 rounded-full border ${s.is_active ? "bg-success/20 border-success/60 text-success" : "bg-muted border-border text-muted-foreground"}`}
                >
                  {s.is_active ? "On" : "Off"}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => refreshSearchMut.mutate(s.id)}
                  disabled={refreshSearchMut.isPending}
                >
                  {refreshSearchMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  Run now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteSearchMut.mutate(s.id)}
                  disabled={deleteSearchMut.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
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
          <TabsTrigger value="email">
            <Mail className="h-3.5 w-3.5" /> Outreach
          </TabsTrigger>
          <TabsTrigger value="reco">Tips</TabsTrigger>
        </TabsList>
        <TabsContent value="cv" className="mt-3">
          <CopyBlock text={result.tailoredCv} />
        </TabsContent>
        <TabsContent value="letter" className="mt-3">
          <CopyBlock text={result.coverLetter} />
        </TabsContent>
        <TabsContent value="email" className="mt-3">
          {result.outreachEmail ? (
            <CopyBlock text={result.outreachEmail} />
          ) : (
            <div className="text-sm text-muted-foreground">No outreach email generated.</div>
          )}
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

function JobCard({
  job,
  active,
  shortlisted,
  salary,
  match,
  onPick,
  onToggleShortlist,
}: {
  job: JobHit;
  active: boolean;
  shortlisted: boolean;
  salary?: SalaryEstimate;
  match?: MatchScoreEstimate;
  onPick: () => void;
  onToggleShortlist: () => void;
}) {
  const score = match?.score ?? null;
  const scoreTone =
    score === null
      ? ""
      : score >= 75
        ? "bg-success/15 text-success border-success/30"
        : score >= 50
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <div
      className={`w-full text-left glass-card rounded-2xl p-4 transition border ${
        active ? "border-primary-glow/70" : "border-transparent hover:border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button onClick={onPick} className="min-w-0 text-left flex-1">
          <div className="font-semibold truncate">{job.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {job.company} {job.location && `· ${job.location}`}
          </div>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {score !== null && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${scoreTone}`}
              title="AI match score vs your CV"
            >
              <Target className="h-3 w-3 inline mr-1 -mt-0.5" />
              {score}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleShortlist();
            }}
            className="p-1 rounded-md hover:bg-secondary/60"
            title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
          >
            {shortlisted ? (
              <BookmarkCheck className="h-4 w-4 text-primary-glow" />
            ) : (
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      {salary && salary.high > 0 && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
          <DollarSign className="h-3 w-3" />
          {fmt(salary.low, salary.currency)} – {fmt(salary.high, salary.currency)}
          <span className="opacity-70">/ {salary.period}</span>
        </div>
      )}

      {job.snippet && (
        <button onClick={onPick} className="block text-left w-full">
          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{job.snippet}</p>
        </button>
      )}
      <div className="flex items-center justify-between mt-2">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-primary-glow inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Open posting
        </a>
        {job.source && <span className="text-[10px] text-muted-foreground">{job.source}</span>}
      </div>
    </div>
  );
}

