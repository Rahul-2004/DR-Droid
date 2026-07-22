import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { adjustCredits, adjustCreditsInTransaction } from "@/lib/credits";
import { apiError, requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { research } from "@/agent/research";
import { calculateProviderCacheSavings } from "@/agent/cost";
import type { Pricing } from "@/providers/types";

const input = z.object({
  conversationId: z.string().cuid().optional(),
  providerKeyId: z.string().cuid().optional(),
  prompt: z.string().trim().min(2).max(12_000),
});
const encoder = new TextEncoder();
const event = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = await rateLimit(`chat:${user.id}`);
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": String(limit.retryAfter) },
      });
    }
    const data = input.parse(await request.json());

    let conversation = data.conversationId
      ? await db.conversation.findFirst({ where: { id: data.conversationId, userId: user.id } })
      : null;
    if (data.conversationId && !conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const requestedKeyId = data.providerKeyId ?? conversation?.providerKeyId ?? undefined;
    const key = requestedKeyId
      ? await db.providerKey.findFirst({ where: { id: requestedKeyId, userId: user.id } })
      : await db.providerKey.findFirst({ where: { userId: user.id, isDefault: true } });
    if (!key) {
      return new Response(JSON.stringify({ error: "Add and select an API key first" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { userId: user.id, providerKeyId: key.id, title: data.prompt.slice(0, 70) },
      });
    } else if (conversation.providerKeyId !== key.id) {
      conversation = await db.conversation.update({ where: { id: conversation.id }, data: { providerKeyId: key.id } });
    }

    const latestMessages = await db.message.findMany({
      where: { conversationId: conversation.id, role: { in: ["USER", "ASSISTANT"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 30,
    });
    const history = latestMessages.reverse().map((message) => ({
      role: message.role === "USER" ? "user" as const : "assistant" as const,
      content: message.content,
    }));
    const debitReference = `research:${randomUUID()}`;
    await db.$transaction(async (tx) => {
      await adjustCreditsInTransaction(tx, user.id, -1, "RESEARCH_DEBIT", debitReference, { conversationId: conversation!.id });
      await tx.message.create({ data: { conversationId: conversation!.id, role: "USER", content: data.prompt } });
    });

    const activeConversation = conversation;
    const stream = new ReadableStream({
      async start(controller) {
        let completed = false;
        try {
          for await (const update of research(activeConversation.id, data.prompt, history, key)) {
            if (update.type === "status") {
              controller.enqueue(event(update));
              continue;
            }

            const providerCacheSavings = calculateProviderCacheSavings(update.usage, key.pricing as Pricing);
            const cacheSavings = update.cacheSavings + providerCacheSavings;
            await db.$transaction(async (tx) => {
              await tx.message.create({
                data: {
                  conversationId: activeConversation.id,
                  role: "ASSISTANT",
                  content: update.content,
                  citations: update.citations as unknown as Prisma.InputJsonValue,
                },
              });
              await tx.usageRecord.create({
                data: {
                  userId: user.id,
                  conversationId: activeConversation.id,
                  provider: key.provider,
                  model: key.defaultModel,
                  inputTokens: update.usage.inputTokens,
                  outputTokens: update.usage.outputTokens,
                  cachedInputTokens: update.usage.cachedInputTokens,
                  reasoningTokens: update.usage.reasoningTokens,
                  toolCalls: update.toolCalls,
                  cacheHit: update.cacheHit || update.usage.cachedInputTokens > 0,
                  cacheSavings,
                  cost: update.cost,
                },
              });
              await tx.conversation.update({
                where: { id: activeConversation.id },
                data: { totalCost: { increment: update.cost }, creditsConsumed: { increment: 1 } },
              });
            });

            completed = true;
            controller.enqueue(event({ type: "answer_start", conversationId: activeConversation.id }));
            for (let index = 0; index < update.content.length; index += 160) {
              controller.enqueue(event({ type: "answer_delta", content: update.content.slice(index, index + 160) }));
            }
            controller.enqueue(event({ ...update, content: undefined, conversationId: activeConversation.id, cacheSavings }));
          }
          controller.enqueue(event({ type: "done" }));
        } catch (error) {
          if (!completed) {
            await adjustCredits(user.id, 1, "RESEARCH_REFUND", `refund:${debitReference}`, { conversationId: activeConversation.id }).catch(() => undefined);
          }
          controller.enqueue(event({ type: "error", message: error instanceof Error ? error.message : "Research failed" }));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
    });
  } catch (error) {
    return apiError(error);
  }
}
