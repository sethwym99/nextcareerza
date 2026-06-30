import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getUsageStatus } from "@/lib/ai.functions";
import {
  FileText, MessageSquare, Target, Mic, Map as MapIcon, ListChecks,
  Crown, Sparkles, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "NextCareer" }] }),
  component: Dashboard,
});

const apps = [
  { to: "/smart-apply" as const, label: "Smart Apply", icon: Wand2, color: "from-fuchsia-500 to-purple-600" },
  { to: "/cv-builder" as const, label: "CV Builder", icon: FileText, color: "from-sky-500 to-indigo-600" },
  { to: "/cover-letter" as const, label: "Cover Letter", icon: MessageSquare, color: "from-emerald-500 to-teal-600" },
  { to: "/job-match" as const, label: "Job Match", icon: Target, color: "from-amber-500 to-orange-600" },
  { to: "/interview" as const, label: "Interview", icon: Mic, color: "from-rose-500 to-pink-600" },
  { to: "/roadmap" as const, label: "Roadmap", icon: MapIcon, color: "from-violet-500 to-fuchsia-600" },
  { to: "/tracker" as const, label: "Tracker", icon: ListChecks, color: "from-cyan-500 to-blue-600" },
  { to: "/upgrade" as const, label: "Upgrade", icon: Crown, color: "from-yellow-400 to-amber-600" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const fn = useServerFn(getUsageStatus);
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fn({ data: undefined as any }) });
  const profile: any = data?.profile;
  const isPremium = profile?.plan === "premium";
  const first = profile?.full_name?.split(" ")[0];
  const cv = data?.counts.cv_analysis ?? 0;
  const interview = data?.counts.interview_session ?? 0;
  const limit = data?.freeLimit ?? 3;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{greeting()}{first ? "," : ""}</p>
          <h1 className="truncate text-2xl font-bold mt-0.5">{first ?? "Welcome"} 👋</h1>
        </div>
        {isPremium ? (
          <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Crown className="h-3.5 w-3.5" /> Premium
          </div>
        ) : (
          <Link to="/upgrade" className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Free
          </Link>
        )}
      </header>

      {/* Usage pills */}
      {!isPremium && (
        <div className="grid grid-cols-2 gap-3">
          <UsagePill label="CV analyses" used={cv} limit={limit} />
          <UsagePill label="Interviews" used={interview} limit={(data as any)?.freeLimits?.interview_session ?? 1} />
        </div>
      )}

      {/* App icon grid */}
      <section>
        <div className="grid grid-cols-4 gap-x-3 gap-y-5">
          {apps.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group flex flex-col items-center gap-1.5 active:scale-95 transition"
              >
                <div className={`h-16 w-16 rounded-[1.4rem] bg-gradient-to-br ${a.color} grid place-items-center shadow-lg shadow-black/20`}>
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                </div>
                <div className="text-[11px] text-center font-medium leading-tight max-w-[4.5rem]">{a.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Smart Apply */}
      <Link
        to="/smart-apply"
        className="block rounded-2xl p-5 bg-[image:var(--gradient-primary)] shadow-[0_10px_30px_-10px_oklch(0.62_0.22_277/0.7)] active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/15 grid place-items-center shrink-0">
            <Wand2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 text-primary-foreground">
            <div className="font-semibold">Smart Apply</div>
            <div className="text-xs opacity-90 truncate">Search live jobs, auto-tailor your CV + cover letter.</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function UsagePill({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <Link to="/billing" className="glass-card rounded-2xl p-3 block">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="font-semibold">{used}/{limit}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-[image:var(--gradient-primary)]" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}
