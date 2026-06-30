import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — NextCareer" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    (async () => {
      // 1) New flow: ?token_hash=...&type=recovery (link sent by our webhook)
      const params = new URLSearchParams(window.location.search);
      const token_hash = params.get("token_hash");
      const type = params.get("type");
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "recovery",
        });
        if (cancelled) return;
        if (error) {
          setError(
            "This reset link has expired or was already used. Request a new one from the sign-in page."
          );
        } else {
          setReady(true);
          // strip the token from the URL
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }

      // 2) Legacy flow: hash fragment session set by Supabase /verify redirect
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) setReady(true);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message || "Couldn't reset password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-display font-bold text-xl mb-6">
          <img src="/logo.png" alt="NextCareer" className="h-9 w-9 rounded-lg" />
          NextCareer
        </Link>
        <div className="glass-card rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">Set a new password</h1>
          {!ready ? (
            <p className="text-sm text-muted-foreground mt-3">
              {error ?? "Open this page from the reset link in your email."}{" "}
              <Link to="/auth" className="text-primary-glow">go back to sign in</Link>.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirm</Label>
                <Input id="pw2" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" variant="hero" className="w-full min-h-12" disabled={busy}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
