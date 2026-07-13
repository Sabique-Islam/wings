/**
 * Dodo Payments client wrapper.
 *
 * Plug-and-play: drop in API keys + product IDs and the existing UI calls
 * `startCheckout` to launch Dodo's overlay/inline checkout.
 *
 * Required env (set in Supabase edge function secrets):
 *   - VITE_DODO_MODE          : "test" | "live"   (default "test")
 *   - VITE_DODO_PUBLIC_KEY    : optional public key (only if Dodo asks for one)
 *   - DODO_PAYMENTS_API_KEY   : server-side bearer token (edge function)
 *
 * Server-side checkout-session creation lives in:
 *   supabase/functions/create-checkout-session/index.ts
 */

export type DodoEvent = {
  event_type: string;
  [k: string]: unknown;
};

export type StartCheckoutOptions = {
  productId: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  /** If provided, opens inline-checkout in this DOM element id; otherwise overlay */
  elementId?: string;
  onEvent?: (e: DodoEvent) => void;
};

let initialized = false;

async function ensureSdk() {
  // dynamic import keeps it out of the main marketing bundle
  const mod = await import("dodopayments-checkout");
  return mod.DodoPayments as any;
}

async function initialize(displayType: "overlay" | "inline", onEvent?: (e: DodoEvent) => void) {
  const Dodo = await ensureSdk();
  const mode = (import.meta.env.VITE_DODO_MODE as "test" | "live") || "test";
  // The SDK is idempotent for our purposes; calling init again only swaps the callback.
  Dodo.Initialize({
    mode,
    displayType,
    onEvent: (e: DodoEvent) => {
      onEvent?.(e);
    },
  });
  initialized = true;
}

/**
 * Calls our edge function to create a checkout session, then opens it via the SDK.
 */
export async function startCheckout(opts: StartCheckoutOptions) {
  const displayType = opts.elementId ? "inline" : "overlay";
  await initialize(displayType, opts.onEvent);

  const checkoutUrl = await createCheckoutUrl(opts);

  const Dodo = await ensureSdk();
  Dodo.Checkout.open(
    opts.elementId
      ? { checkoutUrl, elementId: opts.elementId }
      : { checkoutUrl }
  );
}

async function createCheckoutUrl(opts: StartCheckoutOptions): Promise<string> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      product_id: opts.productId,
      customer_email: opts.customerEmail,
      customer_name: opts.customerName,
      return_url: opts.returnUrl ?? `${window.location.origin}/checkout/success`,
    },
  });
  if (error) throw error;
  if (!data?.checkout_url) throw new Error("no checkout_url returned from server");
  return data.checkout_url as string;
}

export const dodo = { startCheckout };
