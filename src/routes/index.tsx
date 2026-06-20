import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Target, Mic, Map as MapIcon, ListChecks, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NextHire — Land Your Next Role with AI" },
      { name: "description", content: "AI career coach: ATS-friendly resumes, tailored cover letters, interview practice, job match scoring, and career roadmaps." },
      { property: "og:title", content: "NextHire — Land Your Next Role with AI" },
      { property: "og:description", content: "Your AI career coach in your pocket. Resume builder, cover letters, interviews and more." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileText, title: "CV Builder", desc: "Upload your CV or start from scratch. AI rewrites for ATS and clarity.", to: "/cv-builder" as const },
  { icon: MessageSquare, title: "Cover Letters", desc: "Paste a job description. Get a tailored letter in seconds.", to: "/cover-letter" as const },
  { icon: Target, title: "Job Match Score", desc: "See how well your CV fits any posting — with missing keywords.", to: "/job-match" as const },
  { icon: Mic, title: "Interview Simulator", desc: "Realistic AI interviews with instant, honest feedback.", to: "/interview" as const },
  { icon: MapIcon, title: "Career Roadmap", desc: "Tell us your goal. Get a step-by-step plan with resources.", to: "/roadmap" as const },
  { icon: ListChecks, title: "Application Tracker", desc: "Track every application, interview, and follow-up.", to: "/tracker" as const },
];

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="inline-grid place-items-center h-8 w-8 rounded-lg bg-[image:var(--gradient-primary)] shadow-[0_0_20px_-2px_oklch(0.62_0.22_277/0.6)]">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            NextHire
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Log in</Link></Button>
            <Button asChild variant="hero" size="sm"><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="mx-auto max-w-5xl px-5 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur mb-6">
            <Sparkles className="h-3 w-3 text-primary-glow" />
            Powered by Lovable AI
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Land your <span className="text-gradient">next role</span>
            <br /> with an AI career coach.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            NextHire rewrites your CV for ATS, tailors cover letters, runs realistic interviews,
            and builds a roadmap to the career you actually want.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="hero"><Link to="/auth">Start free</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#features">See features</a></Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">3 CV analyses + 3 interview sessions free every month.</p>
        </div>
      </section>

      {/* Bento features */}
      <section id="features" className="mx-auto max-w-7xl px-5 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need to get hired</h2>
          <p className="mt-2 text-muted-foreground">Six AI-powered tools, one career.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
          {features.map((f, i) => {
            const Icon = f.icon;
            const span = i === 0 ? "md:col-span-2 md:row-span-2" : i === 3 ? "md:col-span-2" : "";
            return (
              <Link
                key={f.title}
                to={f.to}
                className={`glass-card rounded-2xl p-6 group hover:border-primary/40 transition-all ${span}`}
              >
                <div className="flex h-full flex-col">
                  <div className="inline-grid place-items-center h-11 w-11 rounded-xl bg-[image:var(--gradient-primary)] mb-4 shadow-[0_0_20px_-4px_oklch(0.62_0.22_277/0.6)]">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                  <div className="mt-auto pt-4 text-sm text-primary-glow opacity-0 group-hover:opacity-100 transition">Open →</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-muted-foreground">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-8">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="text-muted-foreground text-sm">For trying things out</p>
            <div className="mt-4 text-4xl font-bold">R0<span className="text-base font-normal text-muted-foreground">/mo</span></div>
            <ul className="mt-6 space-y-2 text-sm">
              {["3 CV analyses / month", "3 interview sessions / month", "Job match scoring", "Career roadmap", "Application tracker"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5" />{t}</li>
              ))}
            </ul>
            <Button asChild variant="outline" className="w-full mt-8"><Link to="/auth">Get started</Link></Button>
          </div>
          <div className="glass-card rounded-2xl p-8 border-primary/40 relative">
            <div className="absolute -top-3 right-6 text-xs px-2 py-1 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">Most popular</div>
            <h3 className="text-xl font-semibold">Premium</h3>
            <p className="text-muted-foreground text-sm">For serious job-seekers</p>
            <div className="mt-4 text-4xl font-bold">R99<span className="text-base font-normal text-muted-foreground">/mo</span></div>
            <ul className="mt-6 space-y-2 text-sm">
              {["Unlimited CV reviews", "Unlimited interviews", "Advanced feedback", "Cover letter generation", "Priority AI models"].map((t) => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5" />{t}</li>
              ))}
            </ul>
            <Button asChild variant="hero" className="w-full mt-8"><Link to="/upgrade">Go Premium</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NextHire. Built with Lovable.
      </footer>
    </div>
  );
}
