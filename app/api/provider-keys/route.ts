import { NextResponse } from "next/server";
import { Provider } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireUser } from "@/lib/auth";
import { encryptSecret, keyHint } from "@/lib/crypto";
import { assertPublicHttpUrl } from "@/lib/safe-url";
import { catalogPricing, isCatalogModel, PROVIDER_PRESETS, type ProviderName } from "@/providers/catalog";

const pricing = z.object({
  inputPerMillion: z.number().nonnegative().finite(),
  outputPerMillion: z.number().nonnegative().finite(),
  cachedInputPerMillion: z.number().nonnegative().finite(),
});
const input = z.object({
  provider: z.nativeEnum(Provider),
  label: z.string().trim().min(2).max(40),
  endpoint: z.string().url().optional(),
  apiKey: z.string().trim().min(8).max(10_000),
  defaultModel: z.string().trim().min(1).max(100),
  pricing: pricing.optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const keys = await db.providerKey.findMany({
      where: { userId: user.id },
      select: { id: true, provider: true, label: true, endpoint: true, keyHint: true, defaultModel: true, pricing: true, isDefault: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(keys);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = input.parse(await request.json());
    const provider = data.provider as ProviderName;
    if (!isCatalogModel(provider, data.defaultModel) && provider !== "OPENAI_COMPATIBLE") {
      return NextResponse.json({ error: "Select a supported model" }, { status: 400 });
    }

    const endpoint = provider === "OPENAI_COMPATIBLE" ? data.endpoint : PROVIDER_PRESETS[provider].endpoint;
    if (!endpoint) return NextResponse.json({ error: "Custom endpoint required" }, { status: 400 });
    if (provider === "OPENAI_COMPATIBLE" && new URL(endpoint).protocol !== "https:") return NextResponse.json({ error: "Custom endpoints must use HTTPS" }, { status: 400 });
    await assertPublicHttpUrl(endpoint);

    const resolvedPricing = catalogPricing(provider, data.defaultModel) ?? data.pricing;
    if (!resolvedPricing) {
      return NextResponse.json({ error: "Enter this model's current token pricing to enable accurate cost tracking" }, { status: 400 });
    }

    const key = await db.$transaction(async (tx) => {
      const existingCount = await tx.providerKey.count({ where: { userId: user.id } });
      const makeDefault = data.isDefault ?? existingCount === 0;
      if (makeDefault) await tx.providerKey.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.providerKey.create({
        data: {
          userId: user.id,
          provider: data.provider,
          label: data.label,
          endpoint,
          encryptedKey: encryptSecret(data.apiKey),
          keyHint: keyHint(data.apiKey),
          defaultModel: data.defaultModel,
          pricing: resolvedPricing,
          isDefault: makeDefault,
        },
        select: { id: true, label: true, provider: true, defaultModel: true, isDefault: true },
      });
    });
    return NextResponse.json(key, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
