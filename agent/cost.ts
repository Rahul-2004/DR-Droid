import type { Pricing, CompletionUsage } from "@/providers/types";

export function calculateCost(usage: CompletionUsage, pricing: Pricing) {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const uncached = Math.max(0, usage.inputTokens - cached);
  return (
    uncached * pricing.inputPerMillion
    + usage.outputTokens * pricing.outputPerMillion
    + cached * (pricing.cachedInputPerMillion ?? pricing.inputPerMillion)
  ) / 1_000_000;
}

export function calculateProviderCacheSavings(usage: CompletionUsage, pricing: Pricing) {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const regular = pricing.inputPerMillion;
  const cache = pricing.cachedInputPerMillion ?? regular;
  return cached * Math.max(0, regular - cache) / 1_000_000;
}
