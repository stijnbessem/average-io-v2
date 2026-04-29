import Stripe from "stripe";
import {
  getIp,
  methodNotAllowed,
  parseBody,
  PAID_COOKIE_NAME,
  rateLimit,
} from "./_lib/rooms.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" }) : null;

const PAID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");
  if (!stripe) {
    return res.status(500).json({ paid: false, error: "Stripe is not configured" });
  }

  const ip = getIp(req);
  // Abuse vector: someone could probe arbitrary emails. 10/min/IP is generous.
  if (rateLimit({ ip, bucket: "restore-access", windowMs: 60_000, max: 10 })) {
    return res.status(429).json({ paid: false, error: "Too many requests" });
  }

  const body = parseBody(req);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !isPlausibleEmail(email)) {
    return res.status(400).json({ paid: false, error: "Invalid email" });
  }

  try {
    const customers = await stripe.customers.search({
      query: `email:'${escapeForSearch(email)}'`,
      limit: 5,
    });

    for (const customer of customers.data || []) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 20,
      });
      const paidSession = (sessions.data || []).find(
        (s) => s.payment_status === "paid" || s.status === "complete",
      );
      if (paidSession) {
        setPaidCookie(res);
        return res.status(200).json({ paid: true });
      }
    }

    return res.status(200).json({ paid: false, error: "No paid purchase found." });
  } catch (err) {
    const message = err && typeof err.message === "string" ? err.message : "Stripe error";
    return res.status(502).json({ paid: false, error: message });
  }
}

function isPlausibleEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeForSearch(email) {
  return email.replace(/['\\]/g, "\\$&");
}

function setPaidCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${PAID_COOKIE_NAME}=1; Path=/; Max-Age=${PAID_COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=Lax`,
  );
}
