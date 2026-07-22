import { Provider } from "@prisma/client";
export type Pricing = { inputPerMillion: number; outputPerMillion: number; cachedInputPerMillion?: number };
export type CompletionUsage = { inputTokens: number; outputTokens: number; cachedInputTokens: number; reasoningTokens: number };
export type Completion = { text: string; usage: CompletionUsage };
export type LlmRequest = { endpoint: string; apiKey: string; model: string; messages: { role: "system" | "user" | "assistant"; content: string }[]; maxTokens?: number };
export type ProviderAdapter = { complete(request: LlmRequest): Promise<Completion> };
export const DEFAULT_ENDPOINTS: Record<Provider, string> = { OPENAI: "https://api.openai.com/v1", ANTHROPIC: "https://api.anthropic.com", KIMI: "https://api.moonshot.ai/v1", GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai", OPENAI_COMPATIBLE: "" };
