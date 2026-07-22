import { GoogleGenAI } from "@google/genai";
import type { Completion, LlmRequest, ProviderAdapter } from "@/providers/types";

export const gemini: ProviderAdapter = {
  async complete(request: LlmRequest): Promise<Completion> {
    const ai = new GoogleGenAI({ apiKey: request.apiKey });
    const systemInstruction = request.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
    const contents = request.messages.filter((message) => message.role !== "system").map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
    const response = await ai.models.generateContent({
      model: request.model,
      contents,
      config: {
        systemInstruction: systemInstruction || undefined,
        maxOutputTokens: request.maxTokens ?? 2048,
        abortSignal: AbortSignal.timeout(90_000),
      },
    });
    const text = response.text ?? "";
    if (!text) throw new Error("Gemini returned an empty response");
    const usage = response.usageMetadata;
    return {
      text,
      usage: {
        inputTokens: usage?.promptTokenCount ?? 0,
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
        cachedInputTokens: usage?.cachedContentTokenCount ?? 0,
        reasoningTokens: usage?.thoughtsTokenCount ?? 0,
      },
    };
  },
};
