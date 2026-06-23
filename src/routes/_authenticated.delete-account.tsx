import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/delete-account")({
  head: () => ({ meta: [{ title: "Delete account — NextCareer" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const navigate = useNavigate();
  const fn = useServerFn(deleteAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (confirm !== "DELETE") {
      toast.error('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    try {
      const res = await fn({ data: undefined as any });
      if (!res?.ok) {
        toast.error(res?.message || "Couldn't delete your account.");
        return;
      }
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message || "Couldn't delete your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-3xl font-bold">Delete your account</h1>
      <p className="text-muted-foreground mt-2">
        This permanently removes your profile, saved CV, applications, application packs,
        usage history and notification tokens. You can't undo this.
      </p>

      <div className="glass-card rounded-2xl p-6 mt-6 border-destructive/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            If you have an active Premium subscription, cancel it first from{" "}
            <Link to="/billing" className="text-primary-glow">/billing</Link> to stop further charges.
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="confirm">Type <span className="font-mono text-foreground">DELETE</span> to confirm</Label>
          <Input id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })} className="min-h-11">Cancel</Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={busy || confirm !== "DELETE"}
            className="min-h-11 flex-1"
          >
            {busy ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
