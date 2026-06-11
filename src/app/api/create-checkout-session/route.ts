import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { stripe, CREDIT_PLANS, type PlanId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to purchase credits." }, { status: 401 });
  }

  const { plan } = await req.json() as { plan: PlanId };
  const planData = CREDIT_PLANS[plan];
  if (!planData) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "https://skinforge.vercel.app";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `SkinForge — ${planData.name}`,
            description: `${planData.credits} AI skin generations`,
          },
          unit_amount: planData.amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      credits: String(planData.credits),
    },
    success_url: `${origin}/editor?payment=success&credits=${planData.credits}`,
    cancel_url: `${origin}/editor`,
  });

  return NextResponse.json({ url: session.url });
}
