/**
 * Server-only Google Play Developer API helpers.
 * Mints an OAuth access token from a service account JSON using Web Crypto
 * (Workers-safe — no jsonwebtoken / googleapis SDK).
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const EXPECTED_ANDROID_PACKAGE = "com.smforge.nextcareer";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

export type PlayServiceAccountInfo = {
  clientEmail: string | null;
  projectId: string | null;
  privateKeyPresent: boolean;
  privateKeyFingerprint: string | null;
  error?: string;
};

export type PlayEndpointCheck = {
  id: "inappproducts" | "subscriptions";
  label: string;
  ok: boolean;
  status: number | null;
  reason: string | null;
  message: string | null;
};

export function getPlayServiceAccountInfo(): PlayServiceAccountInfo {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return {
      clientEmail: null,
      projectId: null,
      privateKeyPresent: false,
      privateKeyFingerprint: null,
      error: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured",
    };
  }
  try {
    const sa = JSON.parse(raw) as Partial<ServiceAccount>;
    const clientEmail = sa.client_email ?? null;
    const projectId = sa.project_id ?? null;
    const pk = sa.private_key;
    const privateKeyPresent =
      typeof pk === "string" &&
      pk.includes("-----BEGIN PRIVATE KEY-----") &&
      pk.includes("-----END PRIVATE KEY-----");

    let privateKeyFingerprint: string | null = null;
    if (privateKeyPresent && typeof pk === "string") {
      const compact = pk
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\s+/g, "");
      privateKeyFingerprint =
        compact.length > 16
          ? `${compact.slice(0, 8)}…${compact.slice(-8)} (${pk.length} chars)`
          : "present (unexpected length)";
    }

    return {
      clientEmail,
      projectId,
      privateKeyPresent,
      privateKeyFingerprint,
    };
  } catch {
    return {
      clientEmail: null,
      projectId: null,
      privateKeyPresent: false,
      privateKeyFingerprint: null,
      error: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON",
    };
  }
}

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
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }

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

function sanitizeGoogleApiError(status: number, text: string): Pick<PlayEndpointCheck, "reason" | "message"> {
  if (!text) return { reason: null, message: null };
  try {
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
        status?: string;
        errors?: Array<{ reason?: string; message?: string }>;
        details?: Array<{ reason?: string; message?: string }>;
      };
    };
    const error = parsed.error;
    const firstError = error?.errors?.[0] ?? error?.details?.[0];
    return {
      reason: firstError?.reason ?? error?.status ?? null,
      message: firstError?.message ?? error?.message ?? `Google Play API failed with ${status}`,
    };
  } catch {
    return {
      reason: null,
      message: text.slice(0, 240),
    };
  }
}

async function checkPlayEndpoint(args: {
  id: PlayEndpointCheck["id"];
  label: string;
  token: string;
  path: string;
}): Promise<PlayEndpointCheck> {
  try {
    const resp = await fetch(`https://androidpublisher.googleapis.com${args.path}`, {
      headers: { authorization: `Bearer ${args.token}` },
    });
    if (resp.ok) {
      return {
        id: args.id,
        label: args.label,
        ok: true,
        status: resp.status,
        reason: null,
        message: null,
      };
    }

    const text = await resp.text();
    const sanitized = sanitizeGoogleApiError(resp.status, text);
    console.warn("[play-billing] setup endpoint check failed", {
      endpoint: args.id,
      status: resp.status,
      reason: sanitized.reason,
      message: sanitized.message,
    });
    return {
      id: args.id,
      label: args.label,
      ok: false,
      status: resp.status,
      ...sanitized,
    };
  } catch (e: any) {
    return {
      id: args.id,
      label: args.label,
      ok: false,
      status: null,
      reason: "request_failed",
      message: String(e?.message || e).slice(0, 240),
    };
  }
}

export async function checkGooglePlaySetup(): Promise<{
  ok: boolean;
  packageNameConfigured: boolean;
  packageNameMatchesApp: boolean;
  serviceAccountConfigured: boolean;
  tokenExchangeOk: boolean;
  packageAccessOk: boolean;
  expectedPackageName: string;
  configuredPackageName: string | null;
  endpointChecks: PlayEndpointCheck[];
  error?: string;
}> {
  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const serviceAccountConfigured = Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON);
  const packageNameConfigured = Boolean(pkg);
  const packageNameMatchesApp = pkg === EXPECTED_ANDROID_PACKAGE;

  const base = {
    ok: false,
    packageNameConfigured,
    packageNameMatchesApp,
    serviceAccountConfigured,
    tokenExchangeOk: false,
    packageAccessOk: false,
    expectedPackageName: EXPECTED_ANDROID_PACKAGE,
    configuredPackageName: pkg ?? null,
    endpointChecks: [],
  };

  if (!pkg || !serviceAccountConfigured) {
    return { ...base, error: "Google Play backend settings are incomplete" };
  }

  if (!packageNameMatchesApp) {
    return {
      ...base,
      error: `Google Play package mismatch. Backend must use ${EXPECTED_ANDROID_PACKAGE}.`,
    };
  }

  try {
    const token = await getAccessToken();

    const encodedPkg = encodeURIComponent(pkg);
    const endpointChecks = await Promise.all([
      checkPlayEndpoint({
        id: "inappproducts",
        label: "In-app products catalog",
        token,
        path: `/androidpublisher/v3/applications/${encodedPkg}/inappproducts?maxResults=1`,
      }),
      checkPlayEndpoint({
        id: "subscriptions",
        label: "Subscriptions catalog",
        token,
        path: `/androidpublisher/v3/applications/${encodedPkg}/subscriptions?pageSize=1`,
      }),
    ]);

    const catalogOk = endpointChecks.every((check) => check.ok);
    if (!catalogOk) {
      const firstFailed = endpointChecks.find((check) => !check.ok);
      const status = firstFailed?.status ? ` (${firstFailed.status})` : "";
      const reason = firstFailed?.reason ? ` ${firstFailed.reason}:` : "";
      return {
        ...base,
        tokenExchangeOk: true,
        endpointChecks,
        error: `Google Play token exchange succeeded, but the Play API catalog check failed${status}.${reason} ${firstFailed?.message ?? "Check Play API linkage, app access propagation, and product/base-plan state."}`,
      };
    }

    return {
      ...base,
      ok: true,
      tokenExchangeOk: true,
      packageAccessOk: true,
      endpointChecks,
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
        state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
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
