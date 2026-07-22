import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { adjustCreditsInTransaction } from "@/lib/credits";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature", { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, env().STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      if (session.payment_status !== "paid") return NextResponse.json({ received: true });
      if (session.currency !== "usd" || session.amount_total !== 500) throw new Error("Unexpected payment amount");
      const userId = session.metadata?.userId ?? session.client_reference_id;
      if (!userId) throw new Error("Missing user ID");
      const credits = Number(session.metadata?.credits);
      if (credits !== 5) throw new Error("Invalid credit grant");

      await db.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { stripeCheckoutSessionId: session.id },
          create: {
            userId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            amountCents: session.amount_total!,
            credits,
            status: PaymentStatus.PAID,
          },
          update: {
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            amountCents: session.amount_total!,
            credits,
            status: PaymentStatus.PAID,
          },
        });
        await adjustCreditsInTransaction(tx, userId, credits, "PURCHASE", `stripe-session:${session.id}`, { checkoutSessionId: session.id });
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook rejected", { type: error instanceof Error ? error.name : typeof error });
    return new NextResponse("Webhook rejected", { status: 400 });
  }
}
