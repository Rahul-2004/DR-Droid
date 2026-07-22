import { errorMessage, fetchWithTimeout } from "@/lib/http";
import type { Completion, LlmRequest, ProviderAdapter } from "@/providers/types";

type CompatibleContent = string | Array<{ type?: string; text?: string }>;
type CompatibleResponse = {
  choices?: Array<{ message?: { content?: CompatibleContent } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
    reasoning_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};
function textFromContent(content: CompatibleContent | undefined) {
  return typeof content === "string" ? content : content?.map((part) => part.text ?? "").join("\n") ?? "";
}

export const openAICompatible: ProviderAdapter = {
  async complete(request: LlmRequest): Promise<Completion> {
    const response = await fetchWithTimeout(`${request.endpoint.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${request.apiKey}` },
      body: JSON.stringify({ model: request.model, messages: request.messages, max_tokens: request.maxTokens ?? 2048 }),
    }, 90_000);
    if (!response.ok) throw new Error(await errorMessage(response, "Provider request failed"));
    const body = await response.json() as CompatibleResponse;
    const usage = body.usage ?? {};
    const text = textFromContent(body.choices?.[0]?.message?.content);
    if (!text) throw new Error("Provider returned an empty response");
    return { text, usage: { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0, cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? usage.cached_tokens ?? 0, reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens ?? 0 } };
  },
};
