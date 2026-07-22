import { test, expect } from "@playwright/test";

const savedKey = { id: "ckey00000000000000000001", label: "My OpenAI", provider: "OPENAI", endpoint: "https://api.openai.com/v1", defaultModel: "gpt-5.6", keyHint: "••••mock", isDefault: true };

async function mockWorkspace(page: import("@playwright/test").Page, options: { credits?: number; keys?: typeof savedKey[] } = {}) {
  let balance = options.credits ?? 0;
  let keys = options.keys ?? [];
  await page.route("**/api/credits", async (route) => route.fulfill({ status: 200, json: { balance } }));
  await page.route("**/api/conversations", async (route) => route.fulfill({ status: 200, json: [] }));
  await page.route("**/api/provider-keys", async (route) => {
    if (route.request().method() === "POST") {
      keys = [savedKey];
      return route.fulfill({ status: 201, json: savedKey });
    }
    return route.fulfill({ status: 200, json: keys });
  });
  await page.route("**/api/coupon", async (route) => {
    balance = 5;
    return route.fulfill({ status: 200, json: { creditsGranted: 5, balance } });
  });
}

test("zero-credit users cannot dismiss the paywall", async ({ page }) => {
  await mockWorkspace(page);
  await page.goto("/e2e/workspace");
  await expect(page.getByRole("heading", { name: "Unlock MicroManus" })).toBeVisible();
  await expect(page.getByPlaceholder("SID_DRDROID")).toBeVisible();
  await expect(page.getByLabel("Close paywall")).toHaveCount(0);
});

test("coupon shows confirmation and unlocks five credits", async ({ page }) => {
  await mockWorkspace(page);
  await page.goto("/e2e/workspace");
  await page.getByPlaceholder("SID_DRDROID").fill("SID_DRDROID");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page.getByRole("heading", { name: "5 credits added" })).toBeVisible();
  await page.getByRole("button", { name: "Start researching" }).click();
  await expect(page.getByText("5 credits", { exact: true })).toBeVisible();
});

test("user can save an encrypted provider key", async ({ page }) => {
  await mockWorkspace(page, { credits: 5 });
  await page.goto("/e2e/workspace?credits=5");
  await page.getByRole("button", { name: "Add your first API key" }).click();
  await expect(page.getByRole("heading", { name: "AI providers" })).toBeVisible();
  await page.getByPlaceholder("Paste your provider API key").fill("sk-mock-key-123456");
  await page.getByRole("button", { name: "Save encrypted key" }).click();
  await expect(page.getByText("API key saved and encrypted.")).toBeVisible();
  await expect(page.getByText("••••mock")).toBeVisible();
});

test("chat renders streamed answer chunks and report affordance", async ({ page }) => {
  await mockWorkspace(page, { credits: 5, keys: [savedKey] });
  await page.route("**/api/chat", async (route) => route.fulfill({
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
    body: [
      'data: {"type":"status","message":"Searching the web..."}\n\n',
      'data: {"type":"answer_start","conversationId":"cchat000000000000000001"}\n\n',
      'data: {"type":"answer_delta","content":"MicroManus is an "}\n\n',
      'data: {"type":"answer_delta","content":"AI research assistant."}\n\n',
      'data: {"type":"answer","conversationId":"cchat000000000000000001"}\n\n',
      'data: {"type":"done"}\n\n',
    ].join(""),
  }));
  await page.route("**/api/conversations/*", async (route) => route.fulfill({
    status: 200,
    json: { id: "cchat000000000000000001", providerKeyId: savedKey.id, messages: [{ id: "message-1", role: "ASSISTANT", content: "MicroManus is an AI research assistant.", citations: [], createdAt: new Date().toISOString() }], reports: [] },
  }));
  await page.goto("/e2e/workspace?credits=5");
  await page.getByPlaceholder("Ask a research question...").fill("What is MicroManus? @report");
  await expect(page.getByText("Report enabled")).toBeVisible();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("MicroManus is an AI research assistant.")).toBeVisible();
});
