import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getBillingStatus } from "@/lib/billing.functions";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — NextCareer" }] }),
  errorComponent: ({ error }) => (
    <div className="glass-card rounded-2xl p-6 text-sm text-destructive">
      Failed to load billing: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
  component: Billing,
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function fmtAmount(amount?: number | null, currency?: string | null) {
  if (amount == null) return "—";
  return `${currency || "ZAR"} ${Number(amount).toFixed(2)}`;
}

function statusColor(status: string) {
  if (status === "COMPLETE") return "text-success";
  if (status === "CANCELLED" || status === "FAILED") return "text-destructive";
  return "text-muted-foreground";
}

function Billing() {
  const fn = useServerFn(getBillingStatus);
  const { data, isLoading, error } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fn({ data: undefined as any }),
  });

  if (isLoading) {
    return <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">Loading billing…</div>;
  }
  if (error) {
    return <div className="glass-card rounded-2xl p-6 text-sm text-destructive">Error: {(error as Error).message}</div>;
  }

  const plan = data?.profile?.plan ?? "free";
  const isPremium = plan === "premium";
  const last = data?.lastSuccess;
  const recent = data?.recent ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Your subscription and recent payment activity.</p>
      </header>

      {/* Plan card */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="mt-1 flex items-center gap-2">
              <Crown className={`h-5 w-5 ${isPremium ? "text-warning" : "text-muted-foreground"}`} />
              <span className="text-2xl font-semibold capitalize">{plan}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Updated {fmtDate(data?.profile?.updated_at)}</div>
          </div>
          {!isPremium ? (
            <Button asChild variant="hero"><Link to="/upgrade">Upgrade to Premium</Link></Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 text-success px-3 py-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active
            </span>
          )}
        </div>
      </section>

      {/* Last successful webhook */}
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-3">Last successful PayFast payment</h2>
        {last ? (
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Status" value={<span className="text-success font-medium">COMPLETE</span>} />
            <Row label="Amount" value={fmtAmount(last.amount_gross, last.currency)} />
            <Row label="Item" value={last.item_name || "—"} />
            <Row label="PayFast ID" value={<span className="font-mono text-xs">{last.pf_payment_id || "—"}</span>} />
            <Row label="Received" value={fmtDate(last.created_at)} />
          </dl>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> No successful payment recorded yet.
          </div>
        )}
      </section>

      {/* Recent events */}
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-3">Recent webhook events</h2>
        {recent.length === 0 ? (
          <div className="text-sm text-muted-foreground">No webhook events yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((ev: any) => (
              <li key={ev.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{fmtDate(ev.created_at)}</span>
                  <span className="truncate">— {ev.item_name || "Payment"}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-muted-foreground">{fmtAmount(ev.amount_gross, ev.currency)}</span>
                  <span className={`font-medium ${statusColor(ev.payment_status)}`}>{ev.payment_status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
