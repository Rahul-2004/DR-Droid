import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata.full_name ?? user.user_metadata.name,
      avatarUrl: user.user_metadata.avatar_url,
      creditAccount: { create: {} },
    },
    update: {
      email: user.email,
      displayName: user.user_metadata.full_name ?? user.user_metadata.name,
      avatarUrl: user.user_metadata.avatar_url,
    },
  });
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export function apiError(error: unknown) {
  if (error instanceof Response) {
    const messages: Record<number, string> = { 401: "Unauthorized", 402: "Credits required", 409: "Coupon already redeemed" };
    return NextResponse.json({ error: error.statusText || messages[error.status] || "Request failed" }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "That name or record already exists" }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  console.error("API request failed", { type: error instanceof Error ? error.name : typeof error });
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}
