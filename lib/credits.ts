import { CreditReason, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function adjustCreditsInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  delta: number,
  reason: CreditReason,
  reference?: string,
  metadata?: Prisma.InputJsonValue,
) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("Credit adjustment must be a non-zero integer");
  if (reference) {
    const existing = await tx.creditTransaction.findUnique({ where: { reference }, include: { account: true } });
    if (existing) return existing.account;
  }

  const account = await tx.creditAccount.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
  });

  if (delta < 0) {
    const debited = await tx.creditAccount.updateMany({
      where: { id: account.id, balance: { gte: Math.abs(delta) } },
      data: { balance: { increment: delta } },
    });
    if (debited.count !== 1) throw new Response("Credits required", { status: 402 });
  } else {
    await tx.creditAccount.update({ where: { id: account.id }, data: { balance: { increment: delta } } });
  }

  const updated = await tx.creditAccount.findUniqueOrThrow({ where: { id: account.id } });
  await tx.creditTransaction.create({
    data: { accountId: account.id, delta, balanceAfter: updated.balance, reason, reference, metadata },
  });
  return updated;
}

export async function adjustCredits(
  userId: string,
  delta: number,
  reason: CreditReason,
  reference?: string,
  metadata?: Prisma.InputJsonValue,
) {
  try {
    return await db.$transaction((tx) => adjustCreditsInTransaction(tx, userId, delta, reason, reference, metadata));
  } catch (error) {
    if (reference && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.creditTransaction.findUnique({ where: { reference }, include: { account: true } });
      if (existing) return existing.account;
    }
    throw error;
  }
}

export async function requireCredits(userId: string, amount = 1) {
  const account = await db.creditAccount.findUnique({ where: { userId } });
  if (!account || account.balance < amount) throw new Response("Credits required", { status: 402 });
  return account;
}
