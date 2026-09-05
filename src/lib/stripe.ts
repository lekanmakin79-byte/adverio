import Stripe from "stripe";

export function getStripe() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured.",
    );
  }

  return new Stripe(stripeSecretKey);
}