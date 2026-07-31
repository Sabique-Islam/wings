/// <reference path="../deno.ns.d.ts" />

// Edge function: create a Dodo Payments checkout session.
// Env: DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_MODE, DODO_ALLOWED_PRODUCT_IDS
// (comma-separated), SITE_URL. verify_jwt is enforced in config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeadersFor } from "../_shared/cors.ts";
import { isAllowedAppUrl } from "../_shared/origins.ts";

const MAX_BODY_BYTES = 4 * 1024;

interface Body {
  product_id: string;
  return_url?: string;
}

function isAllowedReturnUrl(raw: string): boolean {
  return isAllowedAppUrl(raw);
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const contentType = req.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) return json({ error: "invalid request" }, 415);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  // Identify the caller (verify_jwt=true also enforces this at the gateway).
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");
  if (!apiKey) return json({ error: "service unavailable" }, 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "payload too large" }, 413);

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  const productId = body?.product_id;
  if (!productId) return json({ error: "invalid request" }, 400);

  // Allowlist product ids so a client can't check out arbitrary products.
  const allowedProducts = (Deno.env.get("DODO_ALLOWED_PRODUCT_IDS") || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (allowedProducts.length === 0 || !allowedProducts.includes(productId)) {
    return json({ error: "invalid product" }, 400);
  }

  // Validate the return_url origin; fall back to SITE_URL on anything unexpected.
  const site = (Deno.env.get("SITE_URL") || "https://wings.nopejs.me").replace(/\/+$/, "");
  const returnUrl = body.return_url && isAllowedReturnUrl(body.return_url)
    ? body.return_url
    : `${site}/checkout/success`;

  const mode = (Deno.env.get("DODO_PAYMENTS_MODE") || "test").toLowerCase();
  const baseUrl = mode === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

  try {
    const dodoRes = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        // Trust the authenticated identity, not client-supplied contact info.
        customer: { email: user.email, name: user.user_metadata?.name || "" },
        return_url: returnUrl,
      }),
    });

    const upstream = await dodoRes.json().catch(() => ({}));
    if (!dodoRes.ok) {
      console.error("dodo checkout error", dodoRes.status);
      return json({ error: "checkout failed" }, 502);
    }

    const checkout_url = upstream.checkout_url || upstream.payment_link || upstream.url;
    if (!checkout_url) return json({ error: "checkout failed" }, 502);

    // Return only the URL — never the upstream session/error body.
    return json({ checkout_url });
  } catch {
    console.error("create-checkout-session failed");
    return json({ error: "checkout failed" }, 500);
  }
});
