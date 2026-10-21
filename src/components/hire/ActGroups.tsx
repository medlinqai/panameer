"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, RedDot } from "@/components/hire/HireUI";

// SE-E001–E004 (+ HB-E009): grouped "needs you" rows with a PAIR of opposite actions that do the work in place.
// The row leaves at once; the call runs after 5 seconds, so Undo simply cancels it (like Notifications).
export type ActAction = {
  label: string;
  primary?: boolean;
  /** A plain link (Price It, Check out, Reply…) — no undo. */
  href?: string;
  external?: boolean;
  /** A POST that does the work. */
  post?: { url: string; body: Record<string, unknown> };
  /** Ask for a value first; it lands in body[field] (× 100 when cents). */
  ask?: { text: string; field: string; cents?: boolean; initial?: string; optional?: boolean };
  toast?: string;
};
export type ActRow = { key: string; href: string; what: string; detail: string; actions: ActAction[] };
export type ActGroup = { title: string; rows: ActRow[] };

type Pending = { key: string; label: string; timer: ReturnType<typeof setTimeout>; run: () => Promise<void> };

export function ActGroups({ groups }: { groups: ActGroup[] }) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Pending | null>(null);

  const restore = (key: string) => setGone((g) => { const n = new Set(g); n.delete(key); return n; });
  const act = (row: ActRow, a: ActAction) => {
    if (!a.post) return;
    const body = { ...a.post.body };
    if (a.ask) {
      const raw = window.prompt(a.ask.text, a.ask.initial ?? "");
      if (raw === null) return;
      if (!raw.trim() && !a.ask.optional) return;
      const v = a.ask.cents ? Math.round(Number(raw.replace(/[^0-9.]/g, "")) * 100) : a.ask.field === "hours" ? Number(raw) : raw.trim();
      if (a.ask.cents && !(Number(v) > 0)) return;
      body[a.ask.field] = v;
    }
    if (latest.current) { clearTimeout(latest.current.timer); void latest.current.run(); }
    setGone((g) => new Set(g).add(row.key));
    const p: Pending = {
      key: row.key, label: a.toast ?? `${a.label} — done`,
      timer: setTimeout(() => void p.run(), 5000),
      run: async () => {
        if (latest.current === p) { latest.current = null; setPending(null); }
        const r = await fetch(a.post!.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
        if (!r?.ok) { const j = (await r?.json().catch(() => ({}))) as { error?: string }; setError(j.error ?? "Couldn't save — try again."); restore(row.key); return; }
        router.refresh();
      },
    };
    latest.current = p;
    setPending(p);
  };
  const undo = () => {
    const p = latest.current;
    if (!p) return;
    clearTimeout(p.timer);
    latest.current = null;
    setPending(null);
    restore(p.key);
  };

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col" data-act-groups>
      {groups.map((g, gi) => {
        const rows = g.rows.filter((r) => !gone.has(r.key));
        return (
          <div key={g.title} data-act-group={g.title}>
            <div className={`flex items-baseline justify-between border-t border-ink pt-3.5 ${rows.length ? "pb-1.5" : "pb-3.5 text-state-inactive"}`}>
              <span className="text-[12px] font-extrabold uppercase tracking-[0.1em]">{g.title}</span>
              {rows.length ? <span className="text-[12px] font-bold text-state-declined">{rows.length}</span> : <span className="text-[12px]">None waiting</span>}
            </div>
            {rows.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-3.5 border-b border-state-sunken pb-3.5 pt-2.5 sm:flex-nowrap" data-act-row>
                <RedDot size={9} />
                <Link href={r.href} className="min-w-0 flex-1 text-ink hover:underline">
                  <span className="block text-[14px] font-bold">{r.what}</span>
                  <span className="mt-0.5 block text-[13px] text-state-inactive">{r.detail}</span>
                </Link>
                <span className="flex w-full gap-1.5 sm:w-auto">
                  {r.actions.map((a) => {
                    const cls = `${a.primary ? BTN : BTN_OUT} flex-1 sm:flex-none`;
                    if (a.href) return a.external ? <a key={a.label} href={a.href} target="_blank" rel="noreferrer" className={cls}>{a.label}</a> : <Link key={a.label} href={a.href} className={cls}>{a.label}</Link>;
                    return <button key={a.label} type="button" className={cls} onClick={() => act(r, a)}>{a.label}</button>;
                  })}
                </span>
              </div>
            ))}
            {gi === groups.length - 1 && <div className="border-t border-state-sunken" />}
          </div>
        );
      })}
      {pending && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 bg-ink px-4 py-3 text-[13.5px] text-surface shadow-lg" data-undo-toast>
          {pending.label}
          <button type="button" onClick={undo} className="font-bold underline underline-offset-4">Undo</button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </div>
  );
}
