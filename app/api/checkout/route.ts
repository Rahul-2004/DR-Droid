import { NextResponse } from "next/server";
import { requireUser, apiError } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST() {
  try {
    const user = await requireUser();
    const config = env();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: config.STRIPE_CREDIT_PRICE_ID, quantity: 1 }],
      success_url: `${config.NEXT_PUBLIC_APP_URL}/app?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.NEXT_PUBLIC_APP_URL}/app?payment=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { userId: user.id, credits: "5" },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
