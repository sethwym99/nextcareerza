import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";
import { isNativeApp, nativePlatform } from "@/lib/platform";
import {
  initBilling,
  getOfferings,
  purchase,
  restore,
  getBillingStatus,
  PRODUCT_IDS,
  type PlayProduct,
} from "@/lib/play-billing";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade — NextCareer" }] }),
  component: Upgrade,
});

const NOTIFY_URL =
  "https://project--0d4ca1e2-ec48-4d2b-8543-5744fc5f0f2c.lovable.app/api/public/payments";
const RECEIVER = "35985205";


function Upgrade() {
  if (isNativeApp()) {
    if (nativePlatform() === "android") return <AndroidUpgrade />;
    return <IosComingSoon />;
  }
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
        <p className="text-sm text-muted-foreground mt-2">Setting up your R99/mo subscription.</p>

        <form
          ref={formRef}
          action="https://payment.payfast.io/eng/process"
          method="post"
          className="hidden"
        >
          <input type="hidden" name="cmd" value="_paynow" />
          <input type="hidden" name="receiver" value={RECEIVER} />
          <input type="hidden" name="notify_url" value={NOTIFY_URL} />
          <input type="hidden" name="amount" value="99" />
          <input type="hidden" name="item_name" value="NextCareer Premium(Monthly)" />
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

function IosComingSoon() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="glass-card rounded-2xl p-8 text-center max-w-md">
        <Sparkles className="h-6 w-6 mx-auto mb-3 text-primary" />
        <h1 className="text-xl font-semibold">Coming soon on iOS</h1>
        <p className="text-sm text-muted-foreground mt-2">
          In-app subscriptions on iOS are not enabled yet. Please use the web version to upgrade for
          now.
        </p>
      </div>
    </div>
  );
}

function AndroidUpgrade() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<PlayProduct[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState(() => getBillingStatus());
  const [initError, setInitError] = useState<string | null>(null);

  const refreshBillingStatus = () => setBillingStatus(getBillingStatus());

  useEffect(() => {
    (async () => {
      try {
        await initBilling();
        const offerings = await getOfferings();
        setProducts(offerings);
      } catch (e: any) {
        console.error(e);
        setInitError(e?.message || String(e) || "Unknown initialization error");
        toast.error("Could not load subscription options");
      } finally {
        refreshBillingStatus();
        setLoading(false);
      }
    })();
  }, []);


  const buy = async (productId: string) => {
    setBusy(productId);
    try {
      await purchase(productId);
      toast.success("Purchase started — follow the Google prompt");
    } catch (e: any) {
      if (!String(e?.message).toLowerCase().includes("cancel")) {
        toast.error(e?.message || "Purchase failed");
      }
    } finally {
      refreshBillingStatus();
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy("restore");
    try {
      await restore();
      toast.success("Restore requested");
    } catch (e: any) {
      toast.error(e?.message || "Restore failed");
    } finally {
      refreshBillingStatus();
      setBusy(null);
    }
  };

  const status = billingStatus;

  return (
    <div className="min-h-[80vh] px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Upgrade</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Unlimited Smart Apply, AI interviews, and resume reviews.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm space-y-4">
          <p className="font-semibold text-foreground">
            Google Play products are not available on this install.
          </p>
          {initError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
              <div className="font-semibold mb-1">Billing init error</div>
              <div className="font-mono break-all">{initError}</div>
            </div>
          )}
          <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
            <li>
              Install the app from the Google Play internal testing opt-in link, not a side-loaded
              APK.
            </li>
            <li>
              Verify the service account in your backend has permission to access Google Play
              Console data.
            </li>
            <li>
              If permissions already look correct, verify Google Play Developer API linkage and wait
              for Google Play permission/catalog propagation.
            </li>
            <li>
              Confirm these exact products are active in Google Play:
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>
                  <code>{PRODUCT_IDS.monthly}</code>
                </li>
                <li>
                  <code>{PRODUCT_IDS.yearly}</code>
                </li>
                <li>
                  <code>{PRODUCT_IDS.lifetime}</code>
                </li>
              </ul>
            </li>
            <li>
              Make sure your tester Google account accepted the test invite and can see this app in
              Play Store.
            </li>
          </ol>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => buy(p.id)}
              disabled={busy !== null}
              className="w-full glass-card rounded-2xl p-5 text-left hover:border-primary/60 transition-colors disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.description || "NextCareer Premium"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{p.priceString}</div>
                  {busy === p.id && (
                    <Loader2 className="h-4 w-4 animate-spin mt-1 ml-auto text-primary" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onRestore}
        disabled={busy !== null}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
      >
        <RotateCcw className="h-4 w-4" />
        Restore purchases
      </button>


      <p className="mt-6 text-xs text-muted-foreground text-center leading-relaxed">
        Subscriptions auto-renew unless cancelled at least 24h before the period ends. Manage in
        your Google Play account.
      </p>
    </div>
  );
}
