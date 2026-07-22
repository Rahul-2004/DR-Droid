export type Citation = { title: string; url: string; description: string };
export type Chat = {
  id: string;
  title: string;
  updatedAt: string;
  totalCost: number;
  creditsConsumed: number;
  providerKey?: { provider: string; defaultModel: string } | null;
};
export type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[] | null;
  createdAt: string;
};
export type SavedKey = {
  id: string;
  label: string;
  provider: string;
  endpoint: string;
  defaultModel: string;
  keyHint: string;
  isDefault: boolean;
};

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}
