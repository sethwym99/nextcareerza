import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { completeOnboarding } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — NextCareer" }] }),
  component: Page,
});

const STEPS = ["About you", "Target role", "Your CV"] as const;

function Page() {
  const nav = useNavigate();
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);
  const finishFn = useServerFn(completeOnboarding);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getFn() });
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ fullName: "", headline: "", targetRole: "", locationText: "", baseCv: "" });
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile && !hydrated) {
      setV({
        fullName: profile.fullName ?? "",
        headline: profile.headline ?? "",
        targetRole: profile.targetRole ?? "",
        locationText: profile.locationText ?? "",
        baseCv: profile.baseCv ?? "",
      });
      setHydrated(true);
    }
  }, [profile, hydrated]);

  async function next() {
    if (step === 0 && !v.fullName.trim()) return toast.error("Please enter your name");
    if (step === 1 && !v.targetRole.trim()) return toast.error("What role are you targeting?");
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      await saveFn({ data: v });
      await finishFn();
      toast.success("You're all set");
      nav({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await finishFn();
      nav({ to: "/dashboard" });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center">
      <div className="glass-card rounded-2xl p-6 md:p-8 max-w-xl w-full">
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-[image:var(--gradient-primary)]" : "bg-secondary"}`} />
              <div className={`mt-2 text-[11px] ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-1 text-primary-glow text-xs">
          <Sparkles className="h-3.5 w-3.5" /> Step {step + 1} of {STEPS.length}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-display">
          {step === 0 && "Tell us about you"}
          {step === 1 && "What role are you chasing?"}
          {step === 2 && "Drop in your CV"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {step === 0 && "We personalize everything from here."}
          {step === 1 && "We'll tailor CVs, cover letters, and interview practice to this."}
          {step === 2 && "Paste it now or skip — you can always add it later from Profile."}
        </p>

        <div className="mt-6 space-y-4">
          {step === 0 && (
            <>
              <Field label="Full name">
                <Input value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} placeholder="Jane Doe" />
              </Field>
              <Field label="One-line headline (optional)">
                <Input value={v.headline} onChange={(e) => setV({ ...v, headline: e.target.value })} placeholder="Senior backend engineer · Cape Town" />
              </Field>
              <Field label="Location (optional)">
                <Input value={v.locationText} onChange={(e) => setV({ ...v, locationText: e.target.value })} placeholder="Cape Town, ZA" />
              </Field>
            </>
          )}
          {step === 1 && (
            <Field label="Target role">
              <Input value={v.targetRole} onChange={(e) => setV({ ...v, targetRole: e.target.value })} placeholder="Senior Software Engineer" autoFocus />
            </Field>
          )}
          {step === 2 && (
            <Field label="Paste your CV (optional)">
              <Textarea value={v.baseCv} onChange={(e) => setV({ ...v, baseCv: e.target.value })} className="min-h-[220px] font-mono text-sm" placeholder="Paste your CV here…" />
            </Field>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} disabled={busy}>Back</Button>}
          <Button variant="hero" className="flex-1 min-h-12" onClick={next} disabled={busy}>
            {step < STEPS.length - 1 ? (<>Continue <ArrowRight className="h-4 w-4" /></>) : (<>{busy ? "Saving…" : "Finish"} <Check className="h-4 w-4" /></>)}
          </Button>
        </div>
        <button onClick={skip} disabled={busy} className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground">Skip for now</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
