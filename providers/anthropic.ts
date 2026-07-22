import { errorMessage, fetchWithTimeout } from "@/lib/http";
import type { Completion, LlmRequest, ProviderAdapter } from "@/providers/types";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
};

export const anthropic: ProviderAdapter = {
  async complete(request: LlmRequest): Promise<Completion> {
    const system = request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const messages = request.messages.filter((message) => message.role !== "system");
    const response = await fetchWithTimeout(`${request.endpoint.replace(/\/$/, "")}/v1/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": request.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: request.model, max_tokens: request.maxTokens ?? 2048, system: system ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : undefined, messages }),
    }, 90_000);
    if (!response.ok) throw new Error(await errorMessage(response, "Anthropic request failed"));
    const body = await response.json() as AnthropicResponse;
    const usage = body.usage ?? {};
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const text = body.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n") ?? "";
    if (!text) throw new Error("Anthropic returned an empty response");
    return { text, usage: { inputTokens: (usage.input_tokens ?? 0) + cacheRead + cacheWrite, outputTokens: usage.output_tokens ?? 0, cachedInputTokens: cacheRead, reasoningTokens: 0 } };
  },
};
