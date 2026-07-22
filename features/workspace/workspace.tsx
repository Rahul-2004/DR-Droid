"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { BarChart3, Bot, CheckCircle2, ChevronRight, FileDown, FileText, KeyRound, LoaderCircle, LogOut, Menu, MessageSquarePlus, Pencil, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KeyDialog } from "@/features/workspace/key-dialog";
import { Paywall } from "@/features/workspace/paywall";
import { fetchJson, type Chat, type Message, type SavedKey } from "@/features/workspace/types";

type Detail = { id: string; providerKeyId: string | null; messages: Message[]; reports: { id: string; title: string; createdAt: string }[] };

function UserMessage({ content }: { content: string }) {
  return <>{content.split(/(@report|create_report)/gi).map((part, index) => /^(?:@report|create_report)$/i.test(part) ? <span key={index} className="font-medium text-violet-200 underline decoration-violet-400 underline-offset-2">{part}</span> : part)}</>;
}

export function Workspace({ user, initialCredits }: { user: { name: string; email: string }; initialCredits: number }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [streamed, setStreamed] = useState<Message[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [showPaywall, setShowPaywall] = useState(initialCredits <= 0);
  const [mobileNav, setMobileNav] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const chats = useQuery({ queryKey: ["conversations"], queryFn: () => fetchJson<Chat[]>("/api/conversations") });
  const credit = useQuery({ queryKey: ["credits"], queryFn: () => fetchJson<{ balance: number }>("/api/credits") });
  const keys = useQuery({ queryKey: ["keys"], queryFn: () => fetchJson<SavedKey[]>("/api/provider-keys") });
  const detail = useQuery({ queryKey: ["conversation", selected], queryFn: () => fetchJson<Detail>(`/api/conversations/${selected}`), enabled: Boolean(selected) && !busy });
  const credits = credit.data?.balance ?? initialCredits;
  const reports = detail.data?.reports ?? [];
  const messages = useMemo(() => [...(detail.data?.messages ?? []), ...streamed], [detail.data?.messages, streamed]);
  const reportCommandActive = /(?:@report|\bcreate_report\b)/i.test(prompt);

  useEffect(() => {
    if (!selectedKey && keys.data?.length) setSelectedKey(keys.data.find((key) => key.isDefault)?.id ?? keys.data[0].id);
  }, [keys.data, selectedKey]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, progress]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");
    if (!payment) return;
    history.replaceState({}, "", "/app");
    if (payment === "cancelled") { setNotice("Payment cancelled. No credits were added."); return; }
    if (!sessionId) { setNotice("Payment returned without a session ID. Check your Stripe dashboard."); return; }
    let cancelled = false;
    async function confirmCredits() {
      setNotice("Confirming your Stripe test payment...");
      for (let attempt = 0; attempt < 15 && !cancelled; attempt++) {
        const paymentStatus = await fetchJson<{ status: string; balance: number }>(`/api/payments/status?session_id=${encodeURIComponent(sessionId!)}`).catch(() => null);
        if (paymentStatus?.status === "PAID") {
          queryClient.setQueryData(["credits"], { balance: paymentStatus.balance });
          setShowPaywall(false);
          setNotice("Payment confirmed — 5 credits are ready.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      if (!cancelled) setNotice("Payment is still processing. Refresh in a moment if the balance has not updated.");
    }
    void confirmCredits();
    return () => { cancelled = true; };
  }, [queryClient]);

  function openChat(id: string | null) {
    setSelected(id);
    setStreamed([]);
    setProgress("");
    setMobileNav(false);
  }

  async function send() {
    if (!prompt.trim() || busy) return;
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!selectedKey) { setShowKeys(true); return; }
    const text = prompt.trim();
    setPrompt("");
    setBusy(true);
    setProgress("Starting research...");
    setStreamed((old) => [...old, { id: `u-${Date.now()}`, role: "USER", content: text, createdAt: new Date().toISOString() }]);
    let assistantId = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected ?? undefined, providerKeyId: selectedKey, prompt: text }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Research request failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming unavailable");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const update = JSON.parse(part.slice(6));
          if (update.type === "status") setProgress(update.message);
          if (update.type === "answer_start") {
            assistantId = `a-${Date.now()}`;
            setSelected(update.conversationId);
            setStreamed((old) => [...old, { id: assistantId, role: "ASSISTANT", content: "", createdAt: new Date().toISOString() }]);
          }
          if (update.type === "answer_delta") {
            setStreamed((old) => old.map((message) => message.id === assistantId ? { ...message, content: message.content + update.content } : message));
          }
          if (update.type === "error") throw new Error(update.message);
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["credits"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation"] }),
      ]);
      setStreamed([]);
    } catch (error) {
      setStreamed((old) => [...old.filter((message) => message.id !== assistantId || message.content), { id: `e-${Date.now()}`, role: "ASSISTANT", content: `**Research error:** ${error instanceof Error ? error.message : "Please try again."}`, createdAt: new Date().toISOString() }]);
      await queryClient.invalidateQueries({ queryKey: ["credits"] });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  async function renameChat() {
    if (!selected) return;
    const current = chats.data?.find((chat) => chat.id === selected)?.title ?? "";
    const title = window.prompt("Rename chat", current)?.trim();
    if (!title || title === current) return;
    await fetchJson(`/api/conversations/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  async function deleteChat() {
    if (!selected || !window.confirm("Delete this conversation and its reports?")) return;
    const response = await fetch(`/api/conversations/${selected}`, { method: "DELETE" });
    if (!response.ok) return;
    openChat(null);
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }

  async function exportReport() {
    if (!selected) return;
    const existing = reports[0];
    if (existing) { window.open(`/api/reports/${existing.id}/pdf`, "_blank", "noopener,noreferrer"); return; }
    const report = await fetchJson<{ id: string }>("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected }) });
    window.open(`/api/reports/${report.id}/pdf`, "_blank", "noopener,noreferrer");
    await queryClient.invalidateQueries({ queryKey: ["conversation", selected] });
  }

  async function logout() { await createClient().auth.signOut(); location.assign("/"); }

  const sidebar = <aside className={`${mobileNav ? "flex" : "hidden"} fixed inset-y-0 left-0 z-20 w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-3 md:static md:flex`}><div className="mb-4 flex items-center justify-between px-2 py-2"><b>MicroManus</b><button className="rounded p-1 hover:bg-zinc-800" aria-label="Provider settings" onClick={() => setShowKeys(true)}><Settings2 size={17}/></button></div><button className="button secondary mb-3 flex items-center justify-center gap-2" onClick={() => openChat(null)}><MessageSquarePlus size={16}/> New chat</button><nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">{chats.isLoading && <p className="px-3 py-2 text-sm text-zinc-500">Loading chats...</p>}{chats.data?.map((chat) => <button key={chat.id} onClick={() => openChat(chat.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selected === chat.id ? "bg-zinc-800" : "hover:bg-zinc-900"}`}><ChevronRight size={14}/><span className="truncate">{chat.title}</span></button>)}</nav><div className="border-t border-zinc-800 pt-3"><a href="/app/analytics" className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-900"><BarChart3 size={16}/> Analytics</a><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-900"><LogOut size={16}/> <span className="truncate">{user.name}</span></button></div></aside>;

  return <div className="flex h-screen overflow-hidden">{sidebar}{mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-10 bg-black/60 md:hidden" onClick={() => setMobileNav(false)}/>}<main className="relative flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><button className="rounded p-1 hover:bg-zinc-800 md:hidden" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="min-w-0"><b className="md:hidden">MicroManus</b><p className="truncate text-sm text-zinc-400">{selected ? chats.data?.find((chat) => chat.id === selected)?.title : "New research"}</p></div></div><div className="flex items-center gap-2">{selected && <><button className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Rename chat" onClick={renameChat}><Pencil size={15}/></button><button className="rounded p-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-300" aria-label="Delete chat" onClick={deleteChat}><Trash2 size={15}/></button></>}<button className="rounded-full bg-violet-500/15 px-3 py-1.5 text-sm text-violet-200" onClick={() => setShowPaywall(true)}>{credits} credits</button><button className="button secondary hidden items-center gap-2 sm:flex" disabled={!selected} onClick={exportReport}><FileDown size={15}/> {reports.length ? "Download PDF" : "Export PDF"}</button></div></header>{notice && <div className="flex items-center justify-center gap-2 border-b border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-100"><CheckCircle2 size={15}/>{notice}<button className="ml-2 text-xs underline" onClick={() => setNotice("")}>Dismiss</button></div>}<section className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto px-5 py-8">{messages.length === 0 ? <div className="m-auto max-w-xl text-center"><Sparkles className="mx-auto mb-5 text-violet-300"/><h1 className="text-3xl font-semibold">What would you like to research?</h1><p className="mt-3 text-zinc-400">I’ll search the web, read relevant sources, compare evidence, and return a cited answer using your selected provider.</p>{!keys.data?.length && <button className="button mt-6 inline-flex items-center gap-2" onClick={() => setShowKeys(true)}><KeyRound size={16}/> Add your first API key</button>}</div> : <div className="space-y-7">{messages.map((message) => <article key={message.id} className={message.role === "USER" ? "ml-auto max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-3" : "max-w-none"}>{message.role === "ASSISTANT" ? <div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{ a: ({ href, children }) => href?.startsWith("/api/reports/") ? <a href={href} className="my-2 inline-flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 no-underline transition hover:bg-violet-500/20"><FileText size={19} className="text-violet-200"/><span className="text-sm font-medium text-violet-100">Download report PDF</span><FileDown size={16} className="text-violet-200"/></a> : <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-200 underline underline-offset-2">{children}</a> }}>{message.content || " "}</ReactMarkdown></div>{message.citations && message.citations.length > 0 && <div className="mt-4 border-t border-zinc-800 pt-3"><p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Sources</p><div className="grid gap-2 sm:grid-cols-2">{message.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-800 p-3 hover:bg-zinc-900"><p className="line-clamp-1 text-sm font-medium text-violet-200">{citation.title}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{citation.description}</p></a>)}</div></div>}</div> : <UserMessage content={message.content}/>}</article>)}{progress && <div className="flex w-fit items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-sm"><span className="relative grid h-7 w-7 place-items-center rounded-full bg-violet-400/15 text-violet-200"><LoaderCircle size={18} className="animate-spin"/><Bot size={11} className="absolute"/></span><div><p className="font-medium text-violet-100">Researching</p><p className="text-xs text-violet-200/80">{progress}</p></div></div>}<div ref={bottom}/></div>}</section><div className="border-t border-zinc-800 p-4"><div className="mx-auto mb-2 flex max-w-4xl items-center justify-between gap-3"><select aria-label="AI provider" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>{keys.data?.map((key) => <option value={key.id} key={key.id}>{key.label} · {key.defaultModel}</option>)}</select><button className="text-xs text-violet-200 hover:text-violet-100" onClick={() => setShowKeys(true)}>Manage providers</button></div><div className="mx-auto flex max-w-4xl gap-2"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask a research question..." className={`input min-h-12 resize-none ${reportCommandActive ? "border-violet-400 ring-1 ring-violet-400/50" : ""}`} rows={2}/><button className="button self-end" onClick={send} disabled={busy || !prompt.trim()} aria-label="Send"><Send size={18}/></button></div><div className="mx-auto mt-2 flex max-w-4xl flex-wrap items-center gap-2 text-xs text-zinc-500"><span>Enter to send · Shift+Enter for newline · One credit per completed run.</span><button type="button" onClick={() => setPrompt((value) => /@report/i.test(value) ? value : `${value}${value.trim() ? " " : ""}@report `)} className="inline-flex items-center gap-1 text-violet-200"><FileText size={13}/><span className="font-medium underline decoration-violet-400 underline-offset-2">@report</span></button><span>creates a downloadable PDF.</span>{reportCommandActive && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-200">Report enabled</span>}</div></div></main>{showPaywall && <Paywall canClose={credits > 0} onClose={() => setShowPaywall(false)} onDone={async () => { await queryClient.invalidateQueries({ queryKey: ["credits"] }); setShowPaywall(false); }}/>} {showKeys && <KeyDialog keys={keys.data ?? []} onClose={() => setShowKeys(false)} onChanged={async () => { await queryClient.invalidateQueries({ queryKey: ["keys"] }); }}/>}</div>;
}
