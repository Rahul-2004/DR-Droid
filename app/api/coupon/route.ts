import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adjustCreditsInTransaction } from "@/lib/credits";
import { apiError, requireUser } from "@/lib/auth";

const couponInput = z.object({ code: z.string().trim() });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { code } = couponInput.parse(await request.json());
    if (code !== "SID_DRDROID") return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });

    const account = await db.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: user.id, couponRedeemedAt: null },
        data: { couponRedeemedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Response("Coupon already redeemed", { status: 409 });
      return adjustCreditsInTransaction(tx, user.id, 5, "COUPON", `coupon:${user.id}`);
    });

    return NextResponse.json({ creditsGranted: 5, balance: account.balance });
  } catch (error) {
    return apiError(error);
  }
}
