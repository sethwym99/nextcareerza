import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, FileText, MessageSquare, Target, Mic, Map, ListChecks, LayoutDashboard, LogOut, Menu, X, Crown, Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

const FREE_ALLOWED = ["/upgrade", "/billing"];

const nav = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { to: "/cv-builder" as const, label: "CV Builder", icon: FileText },
  { to: "/cover-letter" as const, label: "Cover Letter", icon: MessageSquare },
  { to: "/job-match" as const, label: "Job Match", icon: Target },
  { to: "/interview" as const, label: "Interview", icon: Mic },
  { to: "/roadmap" as const, label: "Roadmap", icon: Map },
  { to: "/tracker" as const, label: "Tracker", icon: ListChecks },
];

function AuthedLayout() {
  const { session, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

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
  const showPaywall = !planLoading && !isPremium && !pathAllowed;


  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen w-64 shrink-0 border-r border-border bg-sidebar/95 backdrop-blur-xl transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-display font-bold">
            <span className="inline-grid place-items-center h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            NextCareer
          </Link>
          <button onClick={() => setOpen(false)} className="md:hidden p-1"><X className="h-5 w-5" /></button>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[0_0_20px_-4px_oklch(0.62_0.22_277/0.6)]" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-border">
          <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" className="w-full justify-start" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border">
          <button onClick={() => setOpen(true)} className="p-2"><Menu className="h-5 w-5" /></button>
          <Link to="/dashboard" className="font-display font-bold">NextCareer</Link>
          <div className="w-9" />
        </header>
        <main className="p-5 md:p-8 max-w-6xl mx-auto">
          {showPaywall ? <Paywall /> : <Outlet />}
        </main>

      </div>
    </div>
  );
}
