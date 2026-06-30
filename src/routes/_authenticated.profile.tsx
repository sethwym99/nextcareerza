import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProfile, saveProfile } from "@/lib/profile.functions";
import { User as UserIcon, Save, Crown, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — NextCareer" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState({
    fullName: "",
    headline: "",
    targetRole: "",
    locationText: "",
    links: "",
    baseCv: "",
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setForm({
        fullName: data.fullName ?? "",
        headline: data.headline ?? "",
        targetRole: data.targetRole ?? "",
        locationText: data.locationText ?? "",
        links: data.links ?? "",
        baseCv: data.baseCv ?? "",
      });
      setHydrated(true);
    }
  }, [data, hydrated]);

  const initial = useMemo(
    () => ({
      fullName: data?.fullName ?? "",
      headline: data?.headline ?? "",
      targetRole: data?.targetRole ?? "",
      locationText: data?.locationText ?? "",
      links: data?.links ?? "",
      baseCv: data?.baseCv ?? "",
    }),
    [data],
  );
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: async () => {
      toast.success("Profile saved");
      await refetch();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  async function onCvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      toast.message("For best results paste plain text from your CV.");
    }
    const text = await file.text();
    setForm((f) => ({ ...f, baseCv: text.slice(0, 40000) }));
  }

  const isPremium = data?.plan === "premium";
  const expires = data?.premiumExpiresAt ? new Date(data.premiumExpiresAt) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserIcon className="h-7 w-7 text-primary-glow" /> Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Your details and base CV. Everything here is saved to your account and
          re-used across CV Builder, Cover Letter, Job Match, and Smart Apply.
        </p>
      </header>

      <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Plan</div>
          <div className="text-lg font-semibold flex items-center gap-2">
            {isPremium ? (
              <>
                <Crown className="h-4 w-4 text-primary-glow" /> Premium
              </>
            ) : (
              "Free"
            )}
          </div>
          {expires && (
            <div className="text-xs text-muted-foreground mt-1">
              Renews / expires {expires.toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to="/billing"
            className="text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary"
          >
            Billing
          </Link>
          {!isPremium && (
            <Link
              to="/upgrade"
              className="text-sm px-3 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">About you</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Email">
            <Input value={data?.email ?? ""} disabled />
          </Field>
          <Field label="Headline">
            <Input
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              placeholder="Senior Product Designer"
            />
          </Field>
          <Field label="Target role">
            <Input
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              placeholder="Staff PM at a SaaS startup"
            />
          </Field>
          <Field label="Location">
            <Input
              value={form.locationText}
              onChange={(e) =>
                setForm({ ...form, locationText: e.target.value })
              }
              placeholder="Cape Town, ZA"
            />
          </Field>
          <Field label="Links (one per line)">
            <Textarea
              value={form.links}
              onChange={(e) => setForm({ ...form, links: e.target.value })}
              placeholder={"linkedin.com/in/...\ngithub.com/..."}
              className="min-h-[80px] text-sm font-mono"
            />
          </Field>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary-glow" /> Base CV
          </h2>
          <input
            type="file"
            accept=".txt,.md"
            onChange={onCvFile}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-secondary-foreground"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This is the CV every AI tool starts from. Paste plain text — formatting
          isn't needed.
        </p>
        <Textarea
          value={form.baseCv}
          onChange={(e) =>
            setForm({ ...form, baseCv: e.target.value.slice(0, 40000) })
          }
          placeholder="Paste your CV text here…"
          className="min-h-[320px] font-mono text-sm"
        />
        <div className="text-xs text-muted-foreground text-right">
          {form.baseCv.length.toLocaleString()} / 40,000 characters
        </div>
      </div>

      <div className="sticky bottom-20 md:bottom-6 flex justify-end gap-3">
        <Button
          variant="outline"
          disabled={!dirty || saveMut.isPending}
          onClick={() => setForm(initial)}
        >
          Reset
        </Button>
        <Button
          variant="hero"
          disabled={!dirty || saveMut.isPending || isLoading}
          onClick={() => saveMut.mutate()}
        >
          <Save className="h-4 w-4" />{" "}
          {saveMut.isPending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
