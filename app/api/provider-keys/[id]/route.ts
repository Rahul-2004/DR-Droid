import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireUser } from "@/lib/auth";
import { catalogPricing, isCatalogModel, type ProviderName } from "@/providers/catalog";

const updateInput = z.object({ defaultModel: z.string().trim().min(1).max(100).optional(), isDefault: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = updateInput.parse(await request.json());
    const existing = await db.providerKey.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let nextPricing = existing.pricing as Prisma.InputJsonValue;
    if (data.defaultModel) {
      const provider = existing.provider as ProviderName;
      if (!isCatalogModel(provider, data.defaultModel) && provider !== "OPENAI_COMPATIBLE") {
        return NextResponse.json({ error: "Select a supported model" }, { status: 400 });
      }
      nextPricing = (catalogPricing(provider, data.defaultModel) ?? existing.pricing) as Prisma.InputJsonValue;
    }

    const updated = await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.providerKey.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.providerKey.update({
        where: { id },
        data: { defaultModel: data.defaultModel, pricing: nextPricing, isDefault: data.isDefault },
        select: { id: true, label: true, provider: true, defaultModel: true, isDefault: true },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.providerKey.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.$transaction(async (tx) => {
      await tx.providerKey.delete({ where: { id } });
      if (existing.isDefault) {
        const replacement = await tx.providerKey.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        if (replacement) await tx.providerKey.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
