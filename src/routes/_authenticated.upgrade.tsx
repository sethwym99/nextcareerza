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
  const [showDebug, setShowDebug] = useState(false);
  const [rawOffering, setRawOffering] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await configureIAP(user?.id ?? null);
        const offering = await loadOfferings();
        setPackages(offering?.availablePackages ?? []);
        setRawOffering(offering);
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
      if (
        e?.code !== "PURCHASE_CANCELLED" &&
        !String(e?.message).toLowerCase().includes("cancel")
      ) {
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

  const status = getIAPConfigStatus();

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
        <div className="glass-card rounded-2xl p-6 text-sm space-y-4">
          <p className="font-semibold text-foreground">
            Google Play subscriptions are not set up yet.
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            <li>
              Create your subscription products in{" "}
              <strong className="text-foreground">Google Play Console</strong>{" "}
              (e.g. monthly Premium).
            </li>
            <li>
              In{" "}
              <strong className="text-foreground">RevenueCat</strong>, connect your
              Google Play app using a service-account JSON key.
            </li>
            <li>
              Make sure your RevenueCat offering contains at least one package
              linked to a Google Play product.
            </li>
            <li>
              Copy your RevenueCat{" "}
              <strong className="text-foreground">public SDK key</strong>{" "}
              (starts with <code>goog_</code>) and add it to this project as{" "}
              <code>VITE_REVENUECAT_ANDROID_KEY</code>.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground pt-2">
            Once configured, reopen this screen and the subscription options will
            appear automatically.
          </p>
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
                  <div className="font-semibold">
                    {pkg.product.title || pkg.identifier}
                  </div>
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

      {import.meta.env.DEV && (
        <div className="mt-6">
          <button
            onClick={() => setShowDebug((s) => !s)}
            className="w-full inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bug className="h-3.5 w-3.5" />
            {showDebug ? "Hide debug info" : "Show debug info"}
            {showDebug ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showDebug && (
            <div className="mt-3 glass-card rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-mono">{nativePlatform()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RevenueCat configured</span>
                <span className="font-mono">
                  {status.configured ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API key present</span>
                <span className="font-mono">
                  {status.hasKey ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Packages loaded</span>
                <span className="font-mono">{packages.length}</span>
              </div>
              {rawOffering && (
                <details className="pt-2">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Raw offering JSON
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/30 p-2 text-[10px]">
                    {JSON.stringify(rawOffering, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center leading-relaxed">
        Subscription auto-renews unless cancelled at least 24h before period
        ends. Manage in your device's subscription settings.
      </p>
    </div>
  );
}
