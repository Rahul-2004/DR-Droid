import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, requireUser } from "@/lib/auth";
import type { SearchResult } from "@/agent/search";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const data = z.object({ conversationId: z.string().cuid(), title: z.string().trim().min(3).max(150).optional() }).parse(await request.json());
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, userId: user.id },
      include: { messages: { where: { role: "ASSISTANT" }, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const message = conversation?.messages[0];
    if (!conversation || !message) return NextResponse.json({ error: "Research response required before creating a report" }, { status: 400 });
    const citations = (message.citations ?? []) as unknown as SearchResult[];
    const sources = citations.length
      ? `\n\n## Sources\n\n${citations.map((citation) => `- ${citation.title}: ${citation.url}`).join("\n")}`
      : "";
    const report = await db.report.create({
      data: { userId: user.id, conversationId: conversation.id, title: data.title ?? conversation.title, content: `${message.content}${sources}` },
    });
    return NextResponse.json({ id: report.id, title: report.title, createdAt: report.createdAt }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
