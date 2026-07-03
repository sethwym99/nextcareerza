/**
 * Server-only Google Play Developer API helpers.
 * Mints an OAuth access token from a service account JSON using Web Crypto
 * (Workers-safe — no jsonwebtoken / googleapis SDK).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function b64urlEncode(buf: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof buf === "string") {
    bytes = new TextEncoder().encode(buf);
  } else if (buf instanceof Uint8Array) {
    bytes = buf;
  } else {
    bytes = new Uint8Array(buf);
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const bin = atob(clean);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured");
  const sa = JSON.parse(raw) as ServiceAccount;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri || TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(claim))}`;

  const keyData = pemToArrayBuffer(sa.private_key.replace(/\\n/g, "\n"));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${b64urlEncode(sig)}`;

  const resp = await fetch(sa.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Token exchange failed: ${resp.status} ${await resp.text()}`);
  }
  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function checkGooglePlaySetup(): Promise<{
  ok: boolean;
  packageNameConfigured: boolean;
  serviceAccountConfigured: boolean;
  tokenExchangeOk: boolean;
  packageAccessOk: boolean;
  error?: string;
}> {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const serviceAccountConfigured = Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);

  const base = {
    ok: false,
    packageNameConfigured: Boolean(pkg),
    serviceAccountConfigured,
    tokenExchangeOk: false,
    packageAccessOk: false,
  };

  if (!pkg || !serviceAccountConfigured) {
    return { ...base, error: "Google Play backend settings are incomplete" };
  }

  try {
    const token = await getAccessToken();
    const resp = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/inappproducts?maxResults=1`,
      { headers: { authorization: `Bearer ${token}` } },
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.warn("[play-billing] setup check package access failed", resp.status, text);
      return {
        ...base,
        tokenExchangeOk: true,
        error:
          resp.status === 401 || resp.status === 403
            ? "Google Play API access is denied for this service account"
            : `Google Play API package check failed (${resp.status})`,
      };
    }

    return {
      ...base,
      ok: true,
      tokenExchangeOk: true,
      packageAccessOk: true,
    };
  } catch (e: any) {
    console.warn("[play-billing] setup check failed", String(e?.message || e));
    return { ...base, error: String(e?.message || e) };
  }
}

export type GoogleSubscription = {
  kind: "subscription";
  expiryTimeMillis?: string;
  startTime?: string;
  expiryTime?: string;
  subscriptionState?: string;
  acknowledgementState?: number | string;
  paymentState?: number;
};

export type GoogleProduct = {
  kind: "product";
  purchaseState?: number;
  acknowledgementState?: number;
};

async function fetchPlay(path: string): Promise<any> {
  const token = await getAccessToken();
  const resp = await fetch(`https://androidpublisher.googleapis.com${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`Play API ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

export async function getSubscriptionV2(purchaseToken: string) {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!pkg) throw new Error("GOOGLE_PLAY_PACKAGE_NAME not configured");
  return fetchPlay(
    `/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
  );
}

export async function getProductPurchase(productId: string, purchaseToken: string) {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!pkg) throw new Error("GOOGLE_PLAY_PACKAGE_NAME not configured");
  return fetchPlay(
    `/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`,
  );
}

const LIFETIME_ID = "nextcareer_premium_lifetime";

export async function verifyAndApply(args: {
  userId: string;
  productId: string;
  purchaseToken: string;
}): Promise<{ ok: boolean; error?: string; expiresAt?: string | null }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    let active = false;
    let expiresAt: string | null = null;
    let raw: any;

    if (args.productId === LIFETIME_ID) {
      raw = await getProductPurchase(args.productId, args.purchaseToken);
      // purchaseState: 0 = purchased, 1 = cancelled, 2 = pending
      active = raw?.purchaseState === 0;
    } else {
      raw = await getSubscriptionV2(args.purchaseToken);
      const state = raw?.subscriptionState as string | undefined;
      active =
        state === "SUBSCRIPTION_STATE_ACTIVE" ||
        state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
      const line = raw?.lineItems?.[0];
      expiresAt = line?.expiryTime ?? null;
    }

    await supabaseAdmin.from("play_purchases").upsert(
      {
        purchase_token: args.purchaseToken,
        user_id: args.userId,
        product_id: args.productId,
        active,
        expires_at: expiresAt,
        raw,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "purchase_token" },
    );

    if (active) {
      await supabaseAdmin
        .from("profiles")
        .update({ plan: "premium", premium_expires_at: expiresAt })
        .eq("id", args.userId);
    }

    return { ok: active, expiresAt };
  } catch (e: any) {
    console.warn("[play-billing] verify failed", {
      productId: args.productId,
      error: String(e?.message || e),
    });
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function handleRtdn(notification: any): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sub = notification?.subscriptionNotification;
  const oneTime = notification?.oneTimeProductNotification;
  const purchaseToken = sub?.purchaseToken ?? oneTime?.purchaseToken;
  const productId = sub?.subscriptionId ?? oneTime?.sku;
  if (!purchaseToken || !productId) return;

  // Find owner from our table (we recorded user_id on first verify).
  const { data: existing } = await supabaseAdmin
    .from("play_purchases")
    .select("user_id")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();
  if (!existing?.user_id) {
    // Unknown token — store the raw event so we can reconcile later.
    await supabaseAdmin.from("play_purchases").upsert(
      {
        purchase_token: purchaseToken,
        product_id: productId,
        active: false,
        raw: notification,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "purchase_token" },
    );
    return;
  }

  // Re-fetch authoritative state from Google.
  await verifyAndApply({
    userId: existing.user_id,
    productId,
    purchaseToken,
  });
}
