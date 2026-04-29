import Stripe from "stripe";
import { methodNotAllowed, parseBody, PAID_COOKIE_NAME } from "./_lib/rooms.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

const PAID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!stripe) {
    return res.status(500).json({ paid: false, error: "Stripe is not configured" });
  }

  const body = parseBody(req);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return res.status(400).json({ paid: false, error: "Missing sessionId" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session?.payment_status === "paid";
    if (paid) {
      setPaidCookie(res);
    }
    return res.status(200).json({ paid });
  } catch (err) {
    const message = err && typeof err.message === "string" ? err.message : "Stripe error";
    return res.status(502).json({ paid: false, error: message });
  }
}

function setPaidCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${PAID_COOKIE_NAME}=1; Path=/; Max-Age=${PAID_COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=Lax`,
  );
}
