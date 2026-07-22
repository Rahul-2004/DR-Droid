"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, DatabaseZap, LoaderCircle } from "lucide-react";

type Analytics = {
  totalChats: number;
  totalCost: number;
  creditsRemaining: number;
  creditsConsumed: number;
  mostUsedModel: string;
  averageCost: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSavings: number;
  toolCalls: number;
  tokens: { input: number; output: number; cached: number; reasoning: number };
  recent: { id: string; chat: string; model: string; inputTokens: number; outputTokens: number; cachedTokens: number; reasoningTokens: number; cost: number; cacheHit: boolean; credits: number; date: string }[];
};

export default function AnalyticsPage() {
  const query = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics");
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not load analytics");
      return response.json() as Promise<Analytics>;
    },
  });
  if (query.isLoading) return <main className="grid min-h-screen place-items-center text-zinc-400"><LoaderCircle className="animate-spin"/></main>;
  if (query.error || !query.data) return <main className="mx-auto max-w-3xl p-10"><p className="rounded-lg bg-red-500/10 p-4 text-red-200">{query.error?.message ?? "Could not load analytics"}</p></main>;
  const data = query.data;
  const cards = [
    ["Total chats", data.totalChats],
    ["Total model cost", `$${data.totalCost.toFixed(6)}`],
    ["Credits remaining", data.creditsRemaining],
    ["Credits consumed", data.creditsConsumed],
    ["Most used model", data.mostUsedModel],
    ["Average cost/chat", `$${data.averageCost.toFixed(6)}`],
  ];
  return <main className="mx-auto max-w-7xl p-6"><a href="/app" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16}/> Back to research</a><h1 className="flex items-center gap-3 text-3xl font-semibold"><BarChart3 className="text-violet-300"/> Usage analytics</h1><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <div className="panel p-5" key={String(label)}><p className="text-sm text-zinc-400">{label}</p><p className="mt-2 truncate text-2xl font-semibold">{String(value)}</p></div>)}</div><section className="mt-6 grid gap-4 lg:grid-cols-2"><div className="panel p-5"><h2 className="flex items-center gap-2 font-medium"><DatabaseZap size={17} className="text-violet-300"/> Token breakdown</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[["Input",data.tokens.input],["Output",data.tokens.output],["Cached input",data.tokens.cached],["Reasoning",data.tokens.reasoning]].map(([label,value]) => <div className="rounded-lg bg-zinc-900 p-3" key={String(label)}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-medium">{Number(value).toLocaleString()}</dd></div>)}</dl></div><div className="panel p-5"><h2 className="font-medium">Cache and tools</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[["Cache hits",data.cacheHits],["Cache misses",data.cacheMisses],["Cache savings",`$${data.cacheSavings.toFixed(6)}`],["Tool calls",data.toolCalls]].map(([label,value]) => <div className="rounded-lg bg-zinc-900 p-3" key={String(label)}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 text-lg font-medium">{String(value)}</dd></div>)}</dl></div></section><section className="panel mt-6 overflow-x-auto"><div className="border-b border-zinc-800 px-4 py-4"><h2 className="font-medium">Recent activity</h2></div><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-zinc-800 text-zinc-400"><tr>{["Chat","Model","Input","Output","Cached","Reasoning","Cost","Credit","Date"].map((heading) => <th className="px-4 py-3 font-medium" key={heading}>{heading}</th>)}</tr></thead><tbody>{data.recent.map((row) => <tr className="border-b border-zinc-900" key={row.id}><td className="max-w-56 truncate px-4 py-3">{row.chat}</td><td className="px-4 py-3">{row.model}</td><td className="px-4 py-3">{row.inputTokens.toLocaleString()}</td><td className="px-4 py-3">{row.outputTokens.toLocaleString()}</td><td className="px-4 py-3 text-emerald-300">{row.cachedTokens.toLocaleString()}</td><td className="px-4 py-3">{row.reasoningTokens.toLocaleString()}</td><td className="px-4 py-3">${row.cost.toFixed(6)}</td><td className="px-4 py-3">{row.credits}</td><td className="px-4 py-3">{new Date(row.date).toLocaleDateString()}</td></tr>)}{data.recent.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-500">No research usage yet.</td></tr>}</tbody></table></section></main>;
}
