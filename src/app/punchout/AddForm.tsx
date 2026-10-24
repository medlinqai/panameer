"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// Scott 10-24: Add to Cart stays on the page — the button says Adding… then ✓ Added, and the cart bar updates. No reload to the top.
export function AddForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <form
      method="post"
      action="/punchout/cart"
      className={className}
      data-state={state}
      onSubmit={async (e) => {
        e.preventDefault();
        setState("adding"); setMsg(null);
        const r = await fetch("/punchout/cart", { method: "POST", body: new FormData(e.currentTarget) }).catch(() => null);
        const err = r?.url ? new URL(r.url).searchParams.get("error") : "Couldn't add it — try again.";
        if (!r || err) { setState("error"); setMsg(err ?? "Couldn't add it — try again."); return; }
        setState("added");
        start(() => router.refresh());
        setTimeout(() => setState("idle"), 2500);
      }}
    >
      {children}
      {state === "adding" && <span className="w-full text-right text-[12.5px] font-semibold text-state-inactive" aria-live="polite">Adding…</span>}
      {state === "added" && <span className="w-full text-right text-[12.5px] font-semibold text-state-accepted" aria-live="polite">✓ Added to your cart</span>}
      {state === "error" && msg && <span role="alert" className="w-full text-right text-[12.5px] font-semibold text-state-declined">{msg}</span>}
    </form>
  );
}
