import type { Config, Context } from "@netlify/functions";

/* The booking deposit.
 *
 * Both the amount and the Stripe key live in Netlify's environment
 * variables, never in this repo and never in the browser:
 *
 *   STRIPE_SECRET_KEY   sk_test_… while testing, sk_live_… for real money
 *   DEPOSIT_PENCE       the deposit in pence, e.g. 2000 for £20
 *
 * With either one missing, online deposits stay switched off and the
 * booking form simply says the deposit will be arranged by email.
 */

declare const Netlify: { env: { get(key: string): string | undefined } };

const CURRENCY = "gbp";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

const format = (pence: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: CURRENCY.toUpperCase(),
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2
  }).format(pence / 100);

function settings() {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  const raw = Netlify.env.get("DEPOSIT_PENCE");
  const pence = Number.parseInt(raw ?? "", 10);
  const valid = Number.isFinite(pence) && pence >= 100 && pence <= 100000;
  return { key, pence, enabled: Boolean(key) && valid };
}

function formEncode(payload: Record<string, unknown>, prefix = ""): string {
  const out: string[] = [];
  const walk = (value: unknown, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${key}[${i}]`));
    else if (typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(v, `${key}[${k}]`);
    } else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  };
  for (const [k, v] of Object.entries(payload)) walk(v, prefix ? `${prefix}[${k}]` : k);
  return out.join("&");
}

export default async (req: Request, _context: Context) => {
  const { key, pence, enabled } = settings();

  /* the page asks on load whether to offer paying now */
  if (req.method === "GET") {
    return enabled
      ? json({ enabled: true, amount: pence, currency: CURRENCY, formatted: format(pence) })
      : json({ enabled: false });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!enabled) {
    return json({ error: "deposit_not_configured" }, 503);
  }

  const origin = new URL(req.url).origin;

  const session = {
    mode: "payment",
    submit_type: "book",
    billing_address_collection: "auto",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: pence,
          product_data: {
            name: "Pottery session deposit",
            description: "Redeemed against the pottery you buy on the day. Refundable up to 48 hours before."
          }
        }
      }
    ],
    metadata: { source: "little-shop-of-gratitude", kind: "session_deposit" },
    success_url: `${origin}/thank-you.html?paid=deposit`,
    cancel_url: `${origin}/#menu`
  };

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: formEncode(session)
    });
    const data = (await res.json()) as { url?: string; error?: { message?: string } };

    if (!res.ok || !data.url) {
      console.error("Stripe rejected the deposit session:", data.error?.message || res.status);
      return json({ error: "stripe_error" }, 502);
    }
    return json({ url: data.url });
  } catch (err) {
    console.error("Could not reach Stripe:", err);
    return json({ error: "stripe_unreachable" }, 502);
  }
};

export const config: Config = { path: "/api/deposit" };
