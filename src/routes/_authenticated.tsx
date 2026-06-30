import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, MessageSquare, Target, Mic, Map, ListChecks, LayoutDashboard, LogOut, Menu, X, Crown, Check, Wand2, MoreHorizontal, User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

const FREE_ALLOWED = ["/upgrade", "/billing", "/delete-account"];

const nav = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/smart-apply" as const, label: "Smart Apply", icon: Wand2 },
  { to: "/cv-builder" as const, label: "CV Builder", icon: FileText },
  { to: "/cover-letter" as const, label: "Cover Letter", icon: MessageSquare },
  { to: "/job-match" as const, label: "Job Match", icon: Target },
  { to: "/interview" as const, label: "Interview", icon: Mic },
  { to: "/roadmap" as const, label: "Roadmap", icon: Map },
  { to: "/tracker" as const, label: "Tracker", icon: ListChecks },
];

// Bottom tab bar — 4 most-used + "More"
const bottomTabs = [
  { to: "/dashboard" as const, label: "Home", icon: LayoutDashboard },
  { to: "/smart-apply" as const, label: "Apply", icon: Wand2 },
  { to: "/tracker" as const, label: "Tracker", icon: ListChecks },
  { to: "/billing" as const, label: "Account", icon: UserIcon },
] as const;

function AuthedLayout() {
  const { session, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    setPlanLoading(true);
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setPlan(data?.plan ?? "free");
          setPlanLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [session?.user?.id, location.pathname]);

  if (loading || !session) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  }

  const isPremium = plan === "premium";
  const pathAllowed = FREE_ALLOWED.some((p) => location.pathname.startsWith(p));
  const showPaywall = !planLoading && !isPremium && !pathAllowed && !skipped;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop + mobile drawer */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-64 shrink-0 border-r border-border bg-sidebar/95 backdrop-blur-xl transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold">
            <img src="/logo.png" alt="NextCareer" className="h-8 w-8 rounded-lg" />
            NextCareer
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-1" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition min-h-11 ${active ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_20px_-4px_oklch(0.62_0.22_277/0.6)]" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-border space-y-1">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Link to="/billing" className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Billing</Link>
          <Link to="/privacy" className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Terms</Link>
          <Link to="/support" className="block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Support</Link>
          <Button variant="ghost" className="w-full justify-start min-h-11" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header
          className="md:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <button onClick={() => setOpen(true)} className="p-2 min-h-11 min-w-11" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold">
            <img src="/logo.png" alt="NextCareer" className="h-7 w-7 rounded-lg" />
            NextCareer
          </Link>
          <div className="w-11" />
        </header>
        <main
          className="p-5 md:p-8 max-w-6xl mx-auto pb-28 md:pb-8"
          style={{ paddingBottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))" }}
        >
          {showPaywall ? <Paywall onSkip={() => setSkipped(true)} /> : <Outlet />}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Primary"
        >
          <div className="grid grid-cols-5 h-16">
            {bottomTabs.map((t) => {
              const Icon = t.icon;
              const active = location.pathname === t.to || (t.to === "/billing" && location.pathname.startsWith("/billing"));
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${active ? "text-primary-glow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_oklch(0.72_0.2_290/0.7)]" : ""}`} />
                  {t.label}
                </Link>
              );
            })}
            <button
              onClick={() => setOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              aria-label="More"
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

function Paywall({ onSkip }: { onSkip: () => void }) {
  const features = [
    "AI-powered CV Builder",
    "Cover Letter generator",
    "Job Match analysis",
    "Mock Interview practice",
    "Career Roadmap",
    "Application Tracker",
  ];
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <div className="glass-card rounded-2xl p-8 md:p-10 max-w-lg w-full text-center">
        <div className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] mx-auto mb-5">
          <Crown className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Unlock NextCareer</h1>
        <p className="text-muted-foreground mt-2">
          Your account is ready. Upgrade to access every tool and accelerate your job search.
        </p>
        <div className="mt-6 text-left space-y-2">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary shrink-0" /> {f}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">R99</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <Link to="/upgrade" className="block mt-6">
          <Button variant="hero" className="w-full min-h-12">Upgrade</Button>
        </Link>
        <Button variant="ghost" className="w-full mt-3 min-h-11" onClick={onSkip}>
          Skip for now
        </Button>
        <Link to="/billing" className="block mt-3 text-xs text-muted-foreground hover:text-foreground">
          View billing status
        </Link>
      </div>
    </div>
  );
}
