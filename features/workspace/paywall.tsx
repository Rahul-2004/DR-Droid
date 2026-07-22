"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, LoaderCircle, Ticket, X } from "lucide-react";

export function Paywall({ canClose, onClose, onDone }: { canClose: boolean; onClose: () => void; onDone: () => void }) {
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  async function redeem() {
    setMessage("");
    setWorking(true);
    try {
      const response = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Coupon could not be redeemed");
      setRedeemed(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Coupon could not be redeemed");
    } finally {
      setWorking(false);
    }
  }

  async function checkout() {
    setMessage("");
    setWorking(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.url) throw new Error(body.error ?? "Checkout could not be started");
      location.assign(body.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not be started");
      setWorking(false);
    }
  }

  if (redeemed) {
    return <div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-4"><div className="panel w-full max-w-md p-7 text-center"><CheckCircle2 className="mx-auto text-emerald-300" size={42}/><h2 className="mt-4 text-xl font-semibold">5 credits added</h2><p className="mt-2 text-sm text-zinc-400">Coupon validated. Your research workspace is now unlocked.</p><button className="button mt-6 w-full" onClick={onDone}>Start researching</button></div></div>;
  }

  return <div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-4"><div className="panel relative w-full max-w-md p-6">{canClose && <button aria-label="Close paywall" className="absolute right-4 top-4 rounded p-1 hover:bg-zinc-800" onClick={onClose}><X size={18}/></button>}<h2 className="text-xl font-semibold">Unlock MicroManus</h2><p className="mt-2 text-sm text-zinc-400">Each completed research run uses one credit. Get 5 credits with a Stripe test payment or your one-time invitation.</p><button className="button mt-5 flex w-full items-center justify-center gap-2" disabled={working} onClick={checkout}>{working ? <LoaderCircle className="animate-spin" size={17}/> : <CreditCard size={17}/>} Buy 5 credits — $5</button><div className="my-5 flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-zinc-800"/>or<span className="h-px flex-1 bg-zinc-800"/></div><label className="text-sm" htmlFor="coupon">Invitation coupon</label><div className="mt-2 flex gap-2"><input id="coupon" className="input" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="SID_DRDROID"/><button className="button secondary flex items-center gap-2" disabled={working || !coupon.trim()} onClick={redeem}><Ticket size={15}/> Redeem</button></div>{message && <p role="alert" className="mt-3 text-sm text-red-300">{message}</p>}<p className="mt-4 text-xs text-zinc-500">Stripe is configured in test mode. No live charge is made.</p></div></div>;
}
