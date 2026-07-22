import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const sessionId = z.string().regex(/^cs_(?:test|live)_[A-Za-z0-9_]+$/).parse(new URL(request.url).searchParams.get("session_id"));
    const [payment, account] = await Promise.all([
      db.payment.findFirst({ where: { stripeCheckoutSessionId: sessionId, userId: user.id }, select: { status: true, credits: true } }),
      db.creditAccount.findUnique({ where: { userId: user.id }, select: { balance: true } }),
    ]);
    return NextResponse.json({ status: payment?.status ?? "PENDING", creditsGranted: payment?.status === "PAID" ? payment.credits : 0, balance: account?.balance ?? 0 });
  } catch (error) {
    return apiError(error);
  }
}
