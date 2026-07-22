import assert from "node:assert/strict";
import test from "node:test";
import { calculateCost, calculateProviderCacheSavings } from "../agent/cost";
import { catalogPricing } from "../providers/catalog";

test("cost separates uncached, cached, and output tokens", () => {
  const usage = { inputTokens: 1_000_000, cachedInputTokens: 400_000, outputTokens: 100_000, reasoningTokens: 0 };
  const pricing = { inputPerMillion: 2, cachedInputPerMillion: 0.2, outputPerMillion: 10 };
  assert.equal(calculateCost(usage, pricing), 2.28);
  assert.equal(calculateProviderCacheSavings(usage, pricing), 0.72);
});

test("cached tokens cannot make uncached cost negative", () => {
  const usage = { inputTokens: 10, cachedInputTokens: 20, outputTokens: 0, reasoningTokens: 0 };
  assert.equal(calculateCost(usage, { inputPerMillion: 1, cachedInputPerMillion: 0.1, outputPerMillion: 1 }), 0.000001);
});

test("verified catalog models have built-in pricing", () => {
  assert.deepEqual(catalogPricing("GEMINI", "gemini-2.5-flash"), { inputPerMillion: 0.3, cachedInputPerMillion: 0.03, outputPerMillion: 2.5 });
  assert.equal(catalogPricing("OPENAI_COMPATIBLE", "anything"), null);
  assert.equal(catalogPricing("KIMI", "kimi-k2.5"), null);
});
