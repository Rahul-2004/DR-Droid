import type { Pricing } from "@/providers/types";

export type ProviderName = "OPENAI" | "ANTHROPIC" | "KIMI" | "GEMINI" | "OPENAI_COMPATIBLE";
export type ModelDefinition = { value: string; label: string; pricing: Pricing | null };

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  OPENAI: "OpenAI",
  ANTHROPIC: "Anthropic",
  KIMI: "Kimi",
  GEMINI: "Google Gemini",
  OPENAI_COMPATIBLE: "OpenAI compatible",
};

export const PROVIDER_PRESETS: Record<ProviderName, { label: string; endpoint: string; defaultModel: string }> = {
  OPENAI: { label: "My OpenAI", endpoint: "https://api.openai.com/v1", defaultModel: "gpt-5.6" },
  ANTHROPIC: { label: "My Anthropic", endpoint: "https://api.anthropic.com", defaultModel: "claude-sonnet-4-20250514" },
  KIMI: { label: "My Kimi", endpoint: "https://api.moonshot.ai/v1", defaultModel: "kimi-k2.5" },
  GEMINI: { label: "My Gemini", endpoint: "https://generativelanguage.googleapis.com", defaultModel: "gemini-2.5-flash" },
  OPENAI_COMPATIBLE: { label: "My custom provider", endpoint: "", defaultModel: "" },
};

export const MODEL_CATALOG: Record<Exclude<ProviderName, "OPENAI_COMPATIBLE">, ModelDefinition[]> = {
  OPENAI: [
    { value: "gpt-5.6", label: "GPT-5.6 Sol", pricing: { inputPerMillion: 5, cachedInputPerMillion: 0.5, outputPerMillion: 30 } },
    { value: "gpt-5.6-terra", label: "GPT-5.6 Terra", pricing: { inputPerMillion: 2.5, cachedInputPerMillion: 0.25, outputPerMillion: 15 } },
    { value: "gpt-5.6-luna", label: "GPT-5.6 Luna", pricing: { inputPerMillion: 1, cachedInputPerMillion: 0.1, outputPerMillion: 6 } },
    { value: "gpt-5", label: "GPT-5", pricing: { inputPerMillion: 1.25, cachedInputPerMillion: 0.125, outputPerMillion: 10 } },
    { value: "gpt-5-mini", label: "GPT-5 Mini", pricing: { inputPerMillion: 0.25, cachedInputPerMillion: 0.025, outputPerMillion: 2 } },
  ],
  ANTHROPIC: [
    { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1", pricing: { inputPerMillion: 15, cachedInputPerMillion: 1.5, outputPerMillion: 75 } },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", pricing: { inputPerMillion: 3, cachedInputPerMillion: 0.3, outputPerMillion: 15 } },
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", pricing: { inputPerMillion: 0.8, cachedInputPerMillion: 0.08, outputPerMillion: 4 } },
  ],
  GEMINI: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", pricing: { inputPerMillion: 0.3, cachedInputPerMillion: 0.03, outputPerMillion: 2.5 } },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", pricing: { inputPerMillion: 0.1, cachedInputPerMillion: 0.01, outputPerMillion: 0.4 } },
  ],
  KIMI: [
    { value: "kimi-k2.5", label: "Kimi K2.5", pricing: null },
    { value: "kimi-k2-thinking", label: "Kimi K2 Thinking", pricing: null },
    { value: "kimi-k2-thinking-turbo", label: "Kimi K2 Thinking Turbo", pricing: null },
  ],
};

export function catalogPricing(provider: ProviderName, model: string) {
  if (provider === "OPENAI_COMPATIBLE") return null;
  return MODEL_CATALOG[provider].find((entry) => entry.value === model)?.pricing ?? null;
}

export function isCatalogModel(provider: ProviderName, model: string) {
  return provider !== "OPENAI_COMPATIBLE" && MODEL_CATALOG[provider].some((entry) => entry.value === model);
}
