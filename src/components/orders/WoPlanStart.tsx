"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
const BTN_W = "inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";

// Board 2 "Set up the plan": five ways to start, each a few minutes.
export function WoPlanStart({ orderId, copyable }: { orderId: string; copyable: { id: string; number: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(copyable[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const endpoint = `/api/orders/${orderId}/plan`;

  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setError(null);
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (r.ok) router.refresh();
    else setError(j.error ?? "That didn't work.");
  };
  const upload = async () => {
    if (!file) return;
    setBusy("import");
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("mode", "replace");
    const r = await fetch(`${endpoint}/import`, { method: "POST", body });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (r.ok) router.refresh();
    else setError(j.error ?? "Could not import that file.");
  };

  const Option = ({ title, text, children }: { title: string; text: string; children: React.ReactNode }) => (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
      <div className="min-w-0 max-w-xl">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13.5px] text-ink-2">{text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );

  return (
    <section data-testid="wo-plan-start" className="mt-8">
      <h2 className="text-[20px] font-bold">Set Up the Plan</h2>
      <p className="mt-1 text-[14px] text-ink-2">Pick a starting point — most plans take 5 to 15 minutes. You can change it any time.</p>
      <ul className="mt-3 border-b border-line">
        <Option title="T&E only" text="One time-and-expense window, no plan. Time and dollars are still tracked above.">
          <button type="button" className={BTN_W} disabled={!!busy} onClick={() => run("te")}>Use T&amp;E Only</button>
        </Option>
        <Option title="Simple milestones" text="A delivery phase with a task for each line on this order, then an acceptance milestone.">
          <button type="button" className={BTN} disabled={!!busy} onClick={() => run("milestones")}>{busy === "milestones" ? "Building…" : "Use Milestones"}</button>
        </Option>
        <Option title="Template" text="Kickoff, delivery, review and acceptance, and a sign-off milestone.">
          <button type="button" className={BTN_W} disabled={!!busy} onClick={() => run("template")}>Use the Template</button>
        </Option>
        <Option title="Copy a past work order" text={copyable.length ? "Start from the plan on one of your earlier work orders." : "None of your earlier work orders has a plan yet."}>
          {copyable.length > 0 && (
            <>
              <select className="h-11 border border-line bg-surface px-2 text-[14px]" aria-label="Copy from" value={from} onChange={(e) => setFrom(e.target.value)}>
                {copyable.map((c) => <option key={c.id} value={c.id}>{c.number}</option>)}
              </select>
              <button type="button" className={BTN_W} disabled={!!busy || !from} onClick={() => run("copy", { from })}>Copy</button>
            </>
          )}
        </Option>
        <Option title="Import (Excel / CSV)" text="Built in Excel or Microsoft Project? Upload it.">
          <input type="file" accept=".xlsx,.csv" aria-label="Plan file" className="max-w-[220px] text-[13px]" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className={BTN_W} disabled={!!busy || !file} onClick={upload}>{busy === "import" ? "Reading…" : "Import"}</button>
        </Option>
      </ul>
      {error && <p className="mt-3 text-[13.5px] font-semibold text-red-700">{error}</p>}
    </section>
  );
}
