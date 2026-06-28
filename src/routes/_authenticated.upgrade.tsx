import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Bug,
} from "lucide-react";
import { isNativeApp, nativePlatform } from "@/lib/platform";
import {
  configureIAP,
  loadOfferings,
  purchasePackage,
  restorePurchases,
  getIAPConfigStatus,
} from "@/lib/iap";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade to Premium — NextCareer" }] }),
  component: Upgrade,
});

const NOTIFY_URL = "https://project--0d4ca1e2-ec48-4d2b-8543-5744fc5f0f2c.lovable.app/api/public/payments";
const RECEIVER = "35023613";

function Upgrade() {
  if (isNativeApp()) return <NativeUpgrade />;
  return <WebUpgrade />;
}

function WebUpgrade() {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="glass-card rounded-2xl p-8 text-center max-w-md">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
        <h1 className="text-xl font-semibold">Redirecting to PayFast…</h1>
        <p className="text-sm text-muted-foreground mt-2">Setting up your R99/mo Premium subscription.</p>

        <form ref={formRef} action="https://payment.payfast.io/eng/process" method="post" className="hidden">
          <input type="hidden" name="cmd" value="_paynow" />
          <input type="hidden" name="receiver" value={RECEIVER} />
          <input type="hidden" name="notify_url" value={NOTIFY_URL} />
          <input type="hidden" name="amount" value="99" />
          <input type="hidden" name="item_name" value="NextCareer Premium" />
          <input type="hidden" name="subscription_type" value="1" />
          <input type="hidden" name="recurring_amount" value="99" />
          <input type="hidden" name="cycles" value="0" />
          <input type="hidden" name="frequency" value="3" />
          <noscript>
            <button type="submit">Continue to PayFast</button>
          </noscript>
        </form>
      </div>
    </div>
  );
}

function NativeUpgrade() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await configureIAP(user?.id ?? null);
        const offering = await loadOfferings();
        setPackages(offering?.availablePackages ?? []);
      } catch (e) {
        console.error(e);
        toast.error("Could not load subscription options");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const buy = async (pkg: any) => {
    setBusy(pkg.identifier);
    try {
      const ok = await purchasePackage(pkg);
      if (ok) {
        toast.success("Premium unlocked!");
        setTimeout(() => window.location.assign("/dashboard"), 800);
      } else {
        toast.error("Purchase did not complete");
      }
    } catch (e: any) {
      if (e?.code !== "PURCHASE_CANCELLED" && !String(e?.message).toLowerCase().includes("cancel")) {
        toast.error(e?.message || "Purchase failed");
      }
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy("restore");
    try {
      const ok = await restorePurchases();
      if (ok) {
        toast.success("Purchases restored");
        setTimeout(() => window.location.assign("/dashboard"), 800);
      } else {
        toast("No active subscription found");
      }
    } catch (e: any) {
      toast.error(e?.message || "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[80vh] px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Go Premium</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Unlimited Smart Apply, AI interviews, and resume reviews.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : packages.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Subscriptions are not available right now. Please try again later.
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <button
              key={pkg.identifier}
              onClick={() => buy(pkg)}
              disabled={busy !== null}
              className="w-full glass-card rounded-2xl p-5 text-left hover:border-primary/60 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{pkg.product.title || pkg.identifier}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pkg.product.description || "NextCareer Premium"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{pkg.product.priceString}</div>
                  {busy === pkg.identifier && (
                    <Loader2 className="h-4 w-4 animate-spin mt-1 ml-auto text-primary" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={restore}
        disabled={busy !== null}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
      >
        <RotateCcw className="h-4 w-4" />
        Restore purchases
      </button>

      <p className="mt-6 text-xs text-muted-foreground text-center leading-relaxed">
        Subscription auto-renews unless cancelled at least 24h before period ends. Manage in your device's subscription settings.
      </p>
    </div>
  );
}
