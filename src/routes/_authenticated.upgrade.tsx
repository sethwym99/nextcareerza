import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { createPayfastCheckout } from "@/lib/payfast.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Upgrade to Premium — NextHire" }] }),
  component: Upgrade,
});

function Upgrade() {
  const fn = useServerFn(createPayfastCheckout);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<{ action: string; fields: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fn({ data: undefined as any })
      .then((res) => setState(res))
      .catch((e: any) => setError(e?.message || "Failed to start checkout"));
  }, [fn]);

  useEffect(() => {
    if (state) formRef.current?.submit();
  }, [state]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="glass-card rounded-2xl p-8 text-center max-w-md">
        {error ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Checkout error</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
            <h1 className="text-xl font-semibold">Redirecting to PayFast…</h1>
            <p className="text-sm text-muted-foreground mt-2">Hold on while we prepare your secure checkout.</p>
          </>
        )}
        {state && (
          <form ref={formRef} action={state.action} method="post" className="hidden">
            {Object.entries(state.fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          </form>
        )}
      </div>
    </div>
  );
}
