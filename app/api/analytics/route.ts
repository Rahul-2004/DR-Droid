import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const [account, chats, totals, modelUsage, cacheHits, recent] = await Promise.all([
      db.creditAccount.findUnique({ where: { userId: user.id } }),
      db.conversation.aggregate({ where: { userId: user.id }, _count: true, _sum: { totalCost: true, creditsConsumed: true } }),
      db.usageRecord.aggregate({
        where: { userId: user.id },
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, cachedInputTokens: true, reasoningTokens: true, toolCalls: true, cacheSavings: true, cost: true },
      }),
      db.usageRecord.groupBy({ by: ["model"], where: { userId: user.id }, _count: true, _sum: { cost: true } }),
      db.usageRecord.count({ where: { userId: user.id, cacheHit: true } }),
      db.usageRecord.findMany({
        where: { userId: user.id },
        include: { conversation: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    const totalChats = chats._count;
    const totalCost = Number(totals._sum.cost ?? chats._sum.totalCost ?? 0);
    const runs = totals._count;
    const mostUsedModel = [...modelUsage].sort((a, b) => b._count - a._count)[0]?.model ?? "—";
    return NextResponse.json({
      totalChats,
      totalCost,
      creditsRemaining: account?.balance ?? 0,
      creditsConsumed: chats._sum.creditsConsumed ?? 0,
      mostUsedModel,
      averageCost: totalChats ? totalCost / totalChats : 0,
      cacheHits,
      cacheMisses: Math.max(0, runs - cacheHits),
      cacheSavings: Number(totals._sum.cacheSavings ?? 0),
      toolCalls: totals._sum.toolCalls ?? 0,
      tokens: {
        input: totals._sum.inputTokens ?? 0,
        output: totals._sum.outputTokens ?? 0,
        cached: totals._sum.cachedInputTokens ?? 0,
        reasoning: totals._sum.reasoningTokens ?? 0,
      },
      models: modelUsage.map((item) => ({ model: item.model, runs: item._count, cost: Number(item._sum.cost ?? 0) })).sort((a, b) => b.runs - a.runs),
      recent: recent.map((record) => ({
        id: record.id,
        chat: record.conversation.title,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cachedTokens: record.cachedInputTokens,
        reasoningTokens: record.reasoningTokens,
        cost: Number(record.cost),
        cacheHit: record.cacheHit,
        credits: 1,
        date: record.createdAt,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
