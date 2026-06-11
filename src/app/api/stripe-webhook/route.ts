import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits ?? "0", 10);

    if (!userId || credits <= 0) {
      return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
    }

    // Use service role to bypass RLS and update any user's credits
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await serviceClient.rpc("add_credits", {
      target_user_id: userId,
      amount: credits,
    });

    if (error) {
      console.error("Failed to add credits:", error);
      return NextResponse.json({ error: "Failed to update credits." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
