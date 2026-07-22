"use client";

import { useState } from "react";
import { ArrowRight, Bot, FileText, LoaderCircle, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("auth_error") ?? "");

  async function signIn() {
    setWorking(true);
    setError("");
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
    if (authError) { setError(authError.message); setWorking(false); }
  }

  return <main className="mx-auto max-w-6xl px-6 py-16"><nav className="flex items-center justify-between"><span className="text-xl font-bold">MicroManus</span><button className="button" disabled={working} onClick={signIn}>{working ? <LoaderCircle className="animate-spin" size={17}/> : "Sign in with Google"}</button></nav><section className="py-24 text-center"><p className="mb-4 text-sm font-semibold text-violet-300">YOUR KEYS. YOUR RESEARCH.</p><h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">From question to evidence-backed report.</h1><p className="mx-auto mt-7 max-w-2xl text-lg text-zinc-400">MicroManus researches the web with the AI provider you choose, shows its progress, and turns findings into polished reports.</p>{error && <p role="alert" className="mx-auto mt-5 max-w-lg rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}<button className="button mt-9 inline-flex items-center gap-2" disabled={working} onClick={signIn}>Start researching <ArrowRight size={17}/></button></section><section className="grid gap-4 md:grid-cols-3">{[[Search,"Evidence first","Search, read, compare, and cite the web."],[Bot,"Bring your own AI","OpenAI, Anthropic, Gemini, Kimi, or a compatible endpoint."],[FileText,"Reports ready","Generate a professional, downloadable PDF from the chat."]].map(([Icon,title,body]) => <article className="panel p-6" key={String(title)}><Icon className="mb-5 text-violet-300"/><h2 className="font-semibold">{String(title)}</h2><p className="mt-2 text-sm text-zinc-400">{String(body)}</p></article>)}</section></main>;
}
