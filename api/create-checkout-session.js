import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

function resolveOrigin(req) {
  const envSite = process.env.SITE_URL;
  if (envSite) return envSite.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!stripe || !priceId) {
    const missing = [
      !stripeSecretKey ? "STRIPE_SECRET_KEY" : null,
      !priceId ? "STRIPE_PRICE_ID" : null,
    ].filter(Boolean);
    return res.status(500).json({
      error: `Stripe server is not configured. Missing: ${missing.join(", ")}`,
    });
  }

  try {
    const origin = resolveOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?stripe=canceled`,
      metadata: {
        source: "comparizzon-paywall",
      },
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    const message =
      error && typeof error.message === "string"
        ? error.message
        : "Failed to create checkout session.";
    return res.status(500).json({ error: message });
  }
}
