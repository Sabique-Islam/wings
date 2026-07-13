// Edge function: create a Dodo Payments checkout session.
// Env needed: DODO_PAYMENTS_API_KEY (set in Supabase project secrets).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  product_id: string;
  customer_email?: string;
  customer_name?: string;
  return_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "DODO_PAYMENTS_API_KEY not configured yet" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mode = (Deno.env.get("DODO_PAYMENTS_MODE") || "test").toLowerCase();
    const baseUrl = mode === "live"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";

    const body = (await req.json()) as Body;
    if (!body?.product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dodoRes = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: body.product_id, quantity: 1 }],
        customer: body.customer_email
          ? { email: body.customer_email, name: body.customer_name || "" }
          : undefined,
        return_url: body.return_url,
      }),
    });

    const json = await dodoRes.json().catch(() => ({}));
    if (!dodoRes.ok) {
      return new Response(JSON.stringify({ error: json?.error || "dodo error", detail: json }), {
        status: dodoRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The Dodo response shape is checkout_url for hosted/overlay/inline flows.
    const checkout_url = json.checkout_url || json.payment_link || json.url;
    return new Response(JSON.stringify({ checkout_url, session: json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
