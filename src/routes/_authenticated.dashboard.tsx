import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getUsageStatus } from "@/lib/ai.functions";
import { FileText, MessageSquare, Target, Mic, Map as MapIcon, ListChecks, Crown, Sparkles, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NextCareer" }] }),
  component: Dashboard,
});

const tools = [
  { to: "/smart-apply" as const, label: "Smart Apply", icon: Wand2, desc: "Paste a job link → tailored CV + cover letter + match + salary in one click.", accent: "from-primary to-primary-glow" },
  { to: "/cv-builder" as const, label: "CV Builder", icon: FileText, desc: "Upload or paste a CV. Get an ATS-friendly rewrite + score.", accent: "from-primary-glow to-primary" },
  { to: "/cover-letter" as const, label: "Cover Letter", icon: MessageSquare, desc: "Tailored cover letters from any job description.", accent: "from-primary to-primary-glow" },
  { to: "/job-match" as const, label: "Job Match Score", icon: Target, desc: "How well does your CV fit this role?", accent: "from-primary-glow to-primary" },
  { to: "/interview" as const, label: "Interview Practice", icon: Mic, desc: "Live AI mock interviews with feedback.", accent: "from-primary to-primary-glow" },
  { to: "/roadmap" as const, label: "Career Roadmap", icon: MapIcon, desc: "Step-by-step plan to your next role.", accent: "from-primary-glow to-primary" },
  { to: "/tracker" as const, label: "Application Tracker", icon: ListChecks, desc: "Track every job you apply to.", accent: "from-primary to-primary-glow" },
];

function Dashboard() {
  const fn = useServerFn(getUsageStatus);
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fn({ data: undefined as any }) });
  const profile: any = data?.profile;
  const isPremium = profile?.plan === "premium";
  const cv = data?.counts.cv_analysis ?? 0;
  const interview = data?.counts.interview_session ?? 0;
  const limit = data?.freeLimit ?? 3;

  return (
    <div className="space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Your career, accelerated.</h1>
        </div>
        <div className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isPremium ? "border-warning text-warning" : "border-border text-muted-foreground"}`}>
          <Crown className="h-3.5 w-3.5" />
          {isPremium ? "Premium" : "Free plan"}
        </div>
      </header>

      {!isPremium && (
        <div className="grid sm:grid-cols-3 gap-3">
          <UsageCard label="CV analyses" used={cv} limit={limit} />
          <UsageCard label="Interview sessions" used={interview} limit={limit} />
          <Link to="/upgrade" className="glass-card rounded-2xl p-4 bg-[image:var(--gradient-primary)] !border-0 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
            <div className="text-sm text-primary-foreground">
              <div className="font-semibold">Go Premium — R99/mo</div>
              <div className="opacity-90">Unlimited everything + cover letters</div>
            </div>
          </Link>
        </div>
      )}

      {/* Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(160px,auto)]">
        {tools.map((t, i) => {
          const Icon = t.icon;
          const span = i === 0 ? "md:col-span-2" : i === 4 ? "md:col-span-2" : "";
          return (
            <Link key={t.to} to={t.to} className={`glass-card rounded-2xl p-6 group hover:border-primary/50 transition ${span}`}>
              <div className={`inline-grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br ${t.accent} shadow-[0_0_20px_-4px_oklch(0.62_0.22_277/0.6)] mb-4`}>
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">{t.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
              <div className="mt-3 text-sm text-primary-glow opacity-0 group-hover:opacity-100 transition">Open →</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used}/{limit}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-[image:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Resets at start of month</p>
    </div>
  );
}
