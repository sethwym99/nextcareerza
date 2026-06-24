import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  FileText, MessageSquare, Target, Mic, Map as MapIcon, ListChecks,
  Wand2, Check, Star, Download, Wifi, BatteryFull, Signal,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextCareer — Your AI Career Coach in Your Pocket" },
      { name: "description", content: "AI career app: Smart Apply (one-click tailored CV + cover letter + match score), ATS resumes, mock interviews, job matching, and career roadmaps." },
      { property: "og:title", content: "NextCareer — Your AI Career Coach" },
      { property: "og:description", content: "Smart Apply, AI resumes, mock interviews and roadmaps — all in one app." },
    ],
  }),
  component: Landing,
});

const apps = [
  { icon: Wand2, label: "Smart Apply", to: "/smart-apply" as const, color: "from-fuchsia-500 to-purple-600" },
  { icon: FileText, label: "CV Builder", to: "/cv-builder" as const, color: "from-sky-500 to-indigo-600" },
  { icon: MessageSquare, label: "Cover Letter", to: "/cover-letter" as const, color: "from-emerald-500 to-teal-600" },
  { icon: Target, label: "Job Match", to: "/job-match" as const, color: "from-amber-500 to-orange-600" },
  { icon: Mic, label: "Interview", to: "/interview" as const, color: "from-rose-500 to-pink-600" },
  { icon: MapIcon, label: "Roadmap", to: "/roadmap" as const, color: "from-violet-500 to-fuchsia-600" },
  { icon: ListChecks, label: "Tracker", to: "/tracker" as const, color: "from-cyan-500 to-blue-600" },
];

function Time() {
  const d = new Date();
  return <span>{d.getHours().toString().padStart(2, "0")}:{d.getMinutes().toString().padStart(2, "0")}</span>;
}

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
      <div className="absolute inset-0 -z-10 opacity-40" style={{
        backgroundImage: "radial-gradient(circle at 20% 10%, oklch(0.72 0.2 290 / 0.35), transparent 40%), radial-gradient(circle at 80% 30%, oklch(0.62 0.22 277 / 0.3), transparent 45%)",
      }} />

      {/* Top mini-nav (desktop only) */}
      <header className="hidden md:block sticky top-0 z-40 backdrop-blur-xl bg-background/40 border-b border-border/50">
        <div className="mx-auto max-w-7xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <img src="/logo.png" alt="NextCareer" className="h-7 w-7 rounded-lg" />
            NextCareer
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Log in</Link></Button>
            <Button asChild variant="hero" size="sm"><Link to="/auth">Get the app</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero: phone-style app preview */}
      <section className="mx-auto max-w-6xl px-4 pt-8 md:pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Phone frame */}
          <div className="order-2 md:order-1 mx-auto">
            <div className="relative mx-auto w-[300px] md:w-[340px] aspect-[9/19] rounded-[3rem] border-[10px] border-foreground/80 bg-background shadow-[0_30px_80px_-20px_oklch(0.62_0.22_277/0.6)] overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-foreground/90 rounded-b-2xl z-10" />
              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[10px] font-semibold">
                <Time />
                <div className="flex items-center gap-1 opacity-80">
                  <Signal className="h-3 w-3" /><Wifi className="h-3 w-3" /><BatteryFull className="h-3.5 w-3.5" />
                </div>
              </div>
              {/* App screen */}
              <div className="px-5 pt-6 h-full" style={{ background: "var(--gradient-hero)" }}>
                <div className="text-center mb-5">
                  <img src="/logo.png" alt="" className="h-14 w-14 rounded-2xl mx-auto shadow-[0_0_30px_-5px_oklch(0.72_0.2_290/0.8)]" />
                  <div className="mt-2 font-display font-bold">NextCareer</div>
                  <div className="text-[10px] text-muted-foreground">Your AI career coach</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {apps.slice(0, 8).map((a) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.label} className="flex flex-col items-center gap-1">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${a.color} grid place-items-center shadow-lg`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-[9px] text-center text-foreground/80 leading-tight">{a.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 glass-card rounded-2xl p-3 text-[10px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center">
                      <Wand2 className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="font-semibold">Smart Apply</div>
                  </div>
                  <div className="text-muted-foreground">Paste a job link → tailored CV, cover letter, and match score in seconds.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 md:order-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur mb-5">
              Built for job seekers
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Your AI career coach,
              <br /><span className="text-gradient">in your pocket.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-lg mx-auto md:mx-0">
              Smart Apply, ATS resumes, mock interviews, job matching and roadmaps — one app, every tool you need to get hired.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Button asChild size="lg" variant="hero" className="rounded-full px-6 min-h-12">
                <Link to="/auth"><Download className="h-4 w-4 mr-1" /> Get the app</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6 min-h-12">
                <a href="#apps">Explore tools</a>
              </Button>
            </div>
            <div className="mt-5 flex items-center justify-center md:justify-start gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> Free forever tier</div>
              <div className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> No card required</div>
            </div>
          </div>
        </div>
      </section>

      {/* App grid */}
      <section id="apps" className="mx-auto max-w-5xl px-5 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Tap an app to begin</h2>
          <p className="text-sm text-muted-foreground mt-1">Seven AI tools. One career.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4 md:gap-6 justify-items-center">
          {apps.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} to={a.to} className="group flex flex-col items-center gap-2 w-20">
                <div className={`h-16 w-16 rounded-[1.4rem] bg-gradient-to-br ${a.color} grid place-items-center shadow-xl transition group-hover:scale-105 group-active:scale-95`}>
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                </div>
                <div className="text-[11px] text-center font-medium leading-tight">{a.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pricing — app-store style cards */}
      <section id="pricing" className="mx-auto max-w-3xl px-5 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">Simple pricing</h2>
          <p className="text-sm text-muted-foreground mt-1">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-semibold">Free</h3>
            <div className="mt-2 text-3xl font-bold">R0<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              {["3 CV analyses / mo", "3 interviews / mo", "Job matching", "Roadmap & tracker"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5" />{t}</li>
              ))}
            </ul>
            <Button asChild variant="outline" className="w-full mt-6 rounded-full"><Link to="/auth">Get started</Link></Button>
          </div>
          <div className="glass-card rounded-3xl p-6 border-primary/40 relative">
            <div className="absolute -top-3 right-6 text-xs px-2 py-1 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">Most popular</div>
            <h3 className="text-lg font-semibold">Premium</h3>
            <div className="mt-2 text-3xl font-bold">R99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm">
              {["Unlimited everything", "Smart Apply (premium AI)", "Advanced interview feedback", "Priority support"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5" />{t}</li>
              ))}
            </ul>
            <Button asChild variant="hero" className="w-full mt-6 rounded-full"><Link to="/upgrade">Go Premium</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="space-x-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/support" className="hover:text-foreground">Support</Link>
        </div>
        <div className="mt-3">© {new Date().getFullYear()} NextCareer</div>
      </footer>
    </div>
  );
}
