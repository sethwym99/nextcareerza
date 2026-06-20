import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade to Premium — NextCareer" }] }),
  component: Upgrade,
});

const NOTIFY_URL = "https://project--0d4ca1e2-ec48-4d2b-8543-5744fc5f0f2c.lovable.app/api/public/payments";
const RECEIVER = "35023613";

function Upgrade() {
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
