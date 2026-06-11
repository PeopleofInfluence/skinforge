import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const CREDIT_PLANS = {
  starter: { credits: 10,  amount: 99,  label: "10 credits",  name: "Starter Pack" },
  creator: { credits: 50,  amount: 399, label: "50 credits",  name: "Creator Pack" },
  pro:     { credits: 200, amount: 999, label: "200 credits", name: "Pro Pack"     },
} as const;

export type PlanId = keyof typeof CREDIT_PLANS;
