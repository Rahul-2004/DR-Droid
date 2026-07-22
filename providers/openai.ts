import { createHash } from "crypto";
import { errorMessage, fetchWithTimeout } from "@/lib/http";
import type { Completion, LlmRequest, ProviderAdapter } from "@/providers/types";

type ResponsePart = { type?: string; text?: string };
type ResponseOutput = { type?: string; content?: ResponsePart[] };

export const openAI: ProviderAdapter = {
  async complete(request: LlmRequest): Promise<Completion> {
    const system = request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const input = request.messages.filter((message) => message.role !== "system").map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const promptCacheKey = createHash("sha256").update(JSON.stringify({ model: request.model, system, input })).digest("hex");
    const response = await fetchWithTimeout(`${request.endpoint.replace(/\/$/, "")}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${request.apiKey}` },
      body: JSON.stringify({
        model: request.model,
        instructions: system || undefined,
        input,
        max_output_tokens: request.maxTokens ?? 2048,
        prompt_cache_key: promptCacheKey,
      }),
    }, 90_000);
    if (!response.ok) throw new Error(await errorMessage(response, "OpenAI request failed"));
    const body = await response.json() as {
      output?: ResponseOutput[];
      output_text?: string;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        input_tokens_details?: { cached_tokens?: number };
        output_tokens_details?: { reasoning_tokens?: number };
      };
    };
    const text = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("\n") ?? "";
    if (!text) throw new Error("OpenAI returned an empty response");
    const usage = body.usage ?? {};
    return {
      text,
      usage: {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0,
        reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
      },
    };
  },
};
