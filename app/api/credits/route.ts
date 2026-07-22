import { NextResponse } from "next/server";
import { db } from "@/lib/db"; import { requireUser, apiError } from "@/lib/auth";
export async function GET() { try { const user = await requireUser(); const account = await db.creditAccount.findUnique({ where: { userId: user.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }); return NextResponse.json(account); } catch (error) { return apiError(error); } }
