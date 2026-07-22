"use client";

import { useState } from "react";
import { Check, KeyRound, LoaderCircle, Star, Trash2, X } from "lucide-react";
import { MODEL_CATALOG, PROVIDER_LABELS, PROVIDER_PRESETS, type ProviderName } from "@/providers/catalog";
import type { SavedKey } from "@/features/workspace/types";

const providers = Object.keys(PROVIDER_LABELS) as ProviderName[];

export function KeyDialog({ keys, onClose, onChanged }: { keys: SavedKey[]; onClose: () => void; onChanged: () => Promise<void> | void }) {
  const [provider, setProvider] = useState<ProviderName>("OPENAI");
  const [form, setForm] = useState({ ...PROVIDER_PRESETS.OPENAI, apiKey: "", inputPerMillion: "", outputPerMillion: "", cachedInputPerMillion: "" });
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const needsPricing = provider === "KIMI" || provider === "OPENAI_COMPATIBLE";
  const models = provider === "OPENAI_COMPATIBLE" ? [] : MODEL_CATALOG[provider];
  const priceSummary = models.find((model) => model.value === form.defaultModel)?.pricing;

  function chooseProvider(next: ProviderName) {
    setProvider(next);
    setForm({ ...PROVIDER_PRESETS[next], apiKey: "", inputPerMillion: "", outputPerMillion: "", cachedInputPerMillion: "" });
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    try {
      const pricing = needsPricing ? {
        inputPerMillion: Number(form.inputPerMillion),
        outputPerMillion: Number(form.outputPerMillion),
        cachedInputPerMillion: Number(form.cachedInputPerMillion),
      } : undefined;
      const response = await fetch("/api/provider-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...form, pricing, isDefault: keys.length === 0 }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not save key");
      setForm({ ...PROVIDER_PRESETS[provider], apiKey: "", inputPerMillion: "", outputPerMillion: "", cachedInputPerMillion: "" });
      setMessage("API key saved and encrypted.");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save key");
    } finally {
      setWorking(false);
    }
  }

  async function updateKey(id: string, method: "PATCH" | "DELETE") {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/provider-keys/${id}`, {
        method,
        headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
        body: method === "PATCH" ? JSON.stringify({ isDefault: true }) : undefined,
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not update key");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update key");
    } finally {
      setWorking(false);
    }
  }

  return <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-black/75 p-4"><div className="panel relative my-6 w-full max-w-2xl p-6"><button type="button" aria-label="Close provider settings" className="absolute right-4 top-4 rounded p-1 hover:bg-zinc-800" onClick={onClose}><X size={18}/></button><h2 className="text-xl font-semibold">AI providers</h2><p className="mt-1 text-sm text-zinc-400">Keys are encrypted before storage and never shown again.</p>{keys.length > 0 && <section className="mt-5 space-y-2"><h3 className="text-sm font-medium text-zinc-300">Saved keys</h3>{keys.map((key) => <div key={key.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><KeyRound size={17} className="text-violet-300"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{key.label} <span className="text-zinc-500">{key.keyHint}</span></p><p className="truncate text-xs text-zinc-500">{PROVIDER_LABELS[key.provider as ProviderName]} · {key.defaultModel}</p></div>{key.isDefault ? <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><Check size={13}/> Default</span> : <button title="Make default" aria-label={`Make ${key.label} default`} className="rounded p-2 hover:bg-zinc-800" disabled={working} onClick={() => updateKey(key.id, "PATCH")}><Star size={15}/></button>}<button title="Delete key" aria-label={`Delete ${key.label}`} className="rounded p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300" disabled={working} onClick={() => updateKey(key.id, "DELETE")}><Trash2 size={15}/></button></div>)}</section>}<form onSubmit={save} className="mt-6 space-y-3 border-t border-zinc-800 pt-5"><h3 className="font-medium">Connect another provider</h3><label className="block text-sm">Provider<select className="input mt-1" value={provider} onChange={(event) => chooseProvider(event.target.value as ProviderName)}>{providers.map((item) => <option value={item} key={item}>{PROVIDER_LABELS[item]}</option>)}</select></label><label className="block text-sm">Name<input className="input mt-1" required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })}/></label>{provider === "OPENAI_COMPATIBLE" && <label className="block text-sm">Endpoint URL<input className="input mt-1" required type="url" placeholder="https://api.example.com/v1" value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })}/></label>}<label className="block text-sm">API key<input className="input mt-1" autoComplete="off" required type="password" placeholder="Paste your provider API key" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })}/></label>{provider === "OPENAI_COMPATIBLE" ? <label className="block text-sm">Model ID<input className="input mt-1" required placeholder="Provider model ID" value={form.defaultModel} onChange={(event) => setForm({ ...form, defaultModel: event.target.value })}/></label> : <label className="block text-sm">Model<select className="input mt-1" value={form.defaultModel} onChange={(event) => setForm({ ...form, defaultModel: event.target.value })}>{models.map((model) => <option value={model.value} key={model.value}>{model.label}</option>)}</select></label>}{priceSummary && <p className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-400">Pricing applied automatically: ${priceSummary.inputPerMillion}/M input · ${priceSummary.outputPerMillion}/M output · ${priceSummary.cachedInputPerMillion}/M cached input.</p>}{needsPricing && <div><p className="mb-2 text-xs text-amber-200">Enter the provider’s current USD price per 1M tokens so analytics remain accurate.</p><div className="grid gap-2 sm:grid-cols-3">{([['inputPerMillion','Input'],['outputPerMillion','Output'],['cachedInputPerMillion','Cached input']] as const).map(([field, label]) => <label className="text-xs text-zinc-400" key={field}>{label}<input className="input mt-1" required type="number" min="0" step="any" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })}/></label>)}</div></div>}{message && <p className={message.includes("saved") ? "text-sm text-emerald-300" : "text-sm text-red-300"}>{message}</p>}<button className="button flex w-full items-center justify-center gap-2" disabled={working}>{working && <LoaderCircle size={16} className="animate-spin"/>} Save encrypted key</button></form></div></div>;
}
