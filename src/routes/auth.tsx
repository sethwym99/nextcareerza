import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NextCareer" },
      { name: "description", content: "Sign in or create your NextCareer account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to NextCareer!");
        navigate({ to: "/dashboard" });
      } else if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      } else {
        // forgot password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for the reset link.");
        setTab("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{ background: "var(--gradient-hero)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-display font-bold text-xl mb-6">
          <img src="/logo.png" alt="NextCareer" className="h-9 w-9 rounded-lg" />
          NextCareer
        </Link>
        <div className="glass-card rounded-2xl p-8">
          {tab !== "forgot" ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} className="mt-6 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-12"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin,
                      });
                      if (result.error) throw new Error(result.error.message || "Google sign-in failed");
                      if (result.redirected) return;
                      navigate({ to: "/dashboard" });
                    } catch (err: any) {
                      toast.error(err.message || "Google sign-in failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"/></svg>
                  Continue with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                </div>
                <form onSubmit={handle} className="space-y-4">
                  {tab === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {tab === "signin" && (
                        <button
                          type="button"
                          onClick={() => setTab("forgot")}
                          className="text-xs text-primary-glow hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={tab === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="hero" className="w-full min-h-12" disabled={busy}>
                    {busy ? "Please wait..." : tab === "signup" ? "Create account" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handle} className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Reset password</h2>
              <p className="text-sm text-muted-foreground">
                We'll email you a link to set a new password.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email-forgot">Email</Label>
                <Input
                  id="email-forgot"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" variant="hero" className="w-full min-h-12" disabled={busy}>
                {busy ? "Sending…" : "Send reset link"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setTab("signin")}>
                Back to sign in
              </Button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6 space-x-3">
          <Link to="/" className="hover:text-foreground">← Back to home</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </p>
      </div>
    </div>
  );
}
