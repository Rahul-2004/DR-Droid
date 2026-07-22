import { Provider } from "@prisma/client";
import { anthropic } from "@/providers/anthropic";
import { openAI } from "@/providers/openai";
import { gemini } from "@/providers/gemini";
import { openAICompatible } from "@/providers/openai-compatible";
export const adapterFor = (provider: Provider) => provider === "ANTHROPIC" ? anthropic : provider === "OPENAI" ? openAI : provider === "GEMINI" ? gemini : openAICompatible;