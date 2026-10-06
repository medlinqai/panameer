"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 1 · Who Gets Paid: saves on click. One person only while the company has one member.
export function PayeeChoice({ value, members }: { value: "COMPANY" | "SOLE_PROPRIETOR"; members: number }) {
  const router = useRouter();
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = async (type: typeof value) => {
    if (type === v || busy) return;
    const was = v;
    setV(type);
    setBusy(true);
    setError(null);
    const r = await fetch("/api/company/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "payee", type }) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) {
      setV(was);
      return setError(b?.error ?? "That didn't save.");
    }
    router.refresh();
  };
  const solo = members <= 1;
  const opt = (type: typeof value, title: string, body: string, disabled = false) => (
    <label className={"flex gap-3 border-b border-line/60 py-3 " + (disabled ? "opacity-50" : "cursor-pointer")}>
      <input type="radio" name="payee" value={type} checked={v === type} disabled={disabled || busy} onChange={() => pick(type)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" data-payee={type} />
      <span>
        <b className="block text-[14.5px]">{title}</b>
        <span className="text-[13.5px] text-ink-2">{body}</span>
      </span>
    </label>
  );
  return (
    <div className="mt-2" data-payee-choice={v}>
      {opt("COMPANY", "This company", "A business with its own tax ID (EIN): LLC, corporation, partnership.")}
      {opt(
        "SOLE_PROPRIETOR",
        "One person (sole proprietor)",
        solo ? "You work for yourself under your own name, SSN or ITIN. Only when you're the company's only member." : `Only when the company has one member — ${members} people are here.`,
        !solo && v !== "SOLE_PROPRIETOR"
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      <p className="mt-3 text-[13px] text-ink-3">W-2 employees don&apos;t set this up — their employer&apos;s company is paid.</p>
    </div>
  );
}
