import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SearchResult } from "@/agent/search";
import type { CompletionUsage } from "@/providers/types";

const TTL_MS = 30 * 60_000;
type CacheValue = { content: string; citations: SearchResult[]; cost: number; usage: CompletionUsage };

export function researchCacheKey(providerKeyId: string, model: string, prompt: string, history: { role: string; content: string }[]) {
  return createHash("sha256").update(JSON.stringify({ providerKeyId, model, prompt, history })).digest("hex");
}

export async function getCachedResearch(cacheKey: string, userId: string) {
  const entry = await db.researchCache.findFirst({ where: { cacheKey, userId, expiresAt: { gt: new Date() } } });
  if (!entry) return null;
  return {
    content: entry.content,
    citations: entry.citations as unknown as SearchResult[],
    cost: Number(entry.cost),
    usage: {
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      cachedInputTokens: entry.cachedInputTokens,
      reasoningTokens: entry.reasoningTokens,
    },
  } satisfies CacheValue;
}

export async function cacheResearch(
  cacheKey: string,
  userId: string,
  providerKeyId: string,
  model: string,
  value: CacheValue,
) {
  await db.researchCache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      userId,
      providerKeyId,
      model,
      content: value.content,
      citations: value.citations as unknown as Prisma.InputJsonValue,
      inputTokens: value.usage.inputTokens,
      outputTokens: value.usage.outputTokens,
      cachedInputTokens: value.usage.cachedInputTokens,
      reasoningTokens: value.usage.reasoningTokens,
      cost: value.cost,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
    update: {
      content: value.content,
      citations: value.citations as unknown as Prisma.InputJsonValue,
      inputTokens: value.usage.inputTokens,
      outputTokens: value.usage.outputTokens,
      cachedInputTokens: value.usage.cachedInputTokens,
      reasoningTokens: value.usage.reasoningTokens,
      cost: value.cost,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
}
