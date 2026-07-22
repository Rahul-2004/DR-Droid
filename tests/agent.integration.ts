import { randomUUID } from "crypto";
import { createServer } from "http";
import { loadEnvConfig } from "@next/env";
import { renderToBuffer } from "@react-pdf/renderer";

loadEnvConfig(process.cwd());

async function main() {
  const [{ db }, { encryptSecret }, { research }, { ResearchReportPdf }] = await Promise.all([
    import("../lib/db"),
    import("../lib/crypto"),
    import("../agent/research"),
    import("../components/pdf-report"),
  ]);
  let providerCalls = 0;
  const server = createServer((request, response) => {
    request.resume();
    providerCalls++;
    const text = providerCalls === 1
      ? '<tool_call>{"name":"create_report","input":{"title":"Integration Report","content":"## Executive Summary\\nThe integration works.\\n\\n## Findings\\n| Check | Result |\\n| --- | --- |\\n| Agent | Passed |\\n\\n## Sources\\n- Local deterministic test\\n\\n## Conclusion\\nPDF generation works."}}</tool_call>'
      : '<tool_call>{"name":"finish","input":{"answer":"The deterministic research result is ready."}}</tool_call>';
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text }] }], usage: { input_tokens: 10, output_tokens: 10 } }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start mock provider");

  const userId = randomUUID();
  await db.user.create({ data: { id: userId, email: `${userId}@integration.invalid`, creditAccount: { create: {} } } });
  const key = await db.providerKey.create({
    data: {
      userId,
      provider: "OPENAI",
      label: "Integration provider",
      endpoint: `http://127.0.0.1:${address.port}`,
      encryptedKey: encryptSecret("integration-key"),
      keyHint: "test",
      defaultModel: "integration-model",
      pricing: { inputPerMillion: 1, cachedInputPerMillion: 0.1, outputPerMillion: 2 },
    },
  });

  try {
    const reportConversation = await db.conversation.create({ data: { userId, providerKeyId: key.id, title: "__AGENT_REPORT_TEST__" } });
    let answer = "";
    for await (const event of research(reportConversation.id, "@report run the deterministic integration test", [], key)) {
      if (event.type === "answer") answer = event.content;
    }
    const report = await db.report.findFirst({ where: { conversationId: reportConversation.id } });
    if (!report || !answer.includes(`/api/reports/${report.id}/pdf`)) throw new Error("Agent did not attach its report");
    const pdf = await renderToBuffer(ResearchReportPdf({ title: report.title, content: report.content }));
    if (pdf.subarray(0, 4).toString() !== "%PDF") throw new Error("Report renderer did not return a PDF");

    const cacheConversation = await db.conversation.create({ data: { userId, providerKeyId: key.id, title: "__AGENT_CACHE_TEST__" } });
    const cachePrompt = "Return the deterministic cached research result";
    const callsBeforeCacheTest = providerCalls;
    for await (const event of research(cacheConversation.id, cachePrompt, [], key)) void event;
    let secondRunHit = false;
    for await (const event of research(cacheConversation.id, cachePrompt, [], key)) {
      if (event.type === "answer") secondRunHit = event.cacheHit;
    }
    if (!secondRunHit || providerCalls !== callsBeforeCacheTest + 1) throw new Error("Persistent research cache did not prevent the duplicate provider call");
    console.log(JSON.stringify({ integration: "agent-report-cache", ok: true, providerCalls, pdfBytes: pdf.length, cacheHit: secondRunHit }));
  } finally {
    server.close();
    await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    await db.$disconnect();
  }
}

void main();
