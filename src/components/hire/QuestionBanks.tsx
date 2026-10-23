"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";
import { QuestionEditor, blankQuestion } from "@/components/hire/QuestionEditor";
import { QTYPE_LABEL, type Question } from "@/lib/question-types";
import type { BankRow } from "@/lib/question-banks";

// QB-E004: Hire › Questions — My Banks, Company Banks and Panameer Starters; edit your own, duplicate any, delete your own.
export function QuestionBanks({ banks }: { banks: BankRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; name: string; shared: boolean; questions: Question[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const call = async (body: object) => {
    setBusy(true); setError(null);
    const r = await fetch("/api/question-banks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't save — try again."); return false; }
    router.refresh();
    return true;
  };
  const groups = [["mine", "My Banks"], ["company", "Company Banks"], ["starter", "Panameer Starters"]] as const;
  return (
    <div className="flex flex-col gap-6" data-question-banks>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[30px] font-extrabold">Questions</h1><p className="text-[14px] text-state-inactive">Reusable question banks — load one in Ask Questions on any job.</p></div>
        <button type="button" onClick={() => setEditing({ id: null, name: "", shared: false, questions: [blankQuestion(), blankQuestion("PICK_ONE"), blankQuestion("NUMBER")] })} className={BTN}>New Bank</button>
      </div>
      {editing && (
        <section className="rounded-[12px] border border-magenta p-5" data-bank-editor>
          <div className="flex flex-wrap items-center gap-3">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Bank name" aria-label="Bank name" className="min-h-10 flex-1 rounded-[8px] border border-state-border px-3 text-[15px] font-semibold" />
            <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={editing.shared} onChange={(e) => setEditing({ ...editing, shared: e.target.checked })} />Share With My Company</label>
          </div>
          <div className="mt-3"><QuestionEditor questions={editing.questions} onChange={(questions) => setEditing({ ...editing, questions })} /></div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={async () => { if (await call({ action: "save", ...editing })) setEditing(null); }} className={BTN}>Save Bank</button>
            <button type="button" onClick={() => setEditing(null)} className={BTN_OUT}>Cancel</button>
          </div>
        </section>
      )}
      {error && <p role="alert" className="text-[13px] font-semibold text-state-declined">{error}</p>}
      {groups.map(([k, label]) => {
        const list = banks.filter((b) => b.source === k);
        return (
          <section key={k}>
            <h2 className="border-b border-ink pb-2 text-[18px] font-extrabold">{label}</h2>
            {list.length ? list.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-3 border-b border-state-sunken py-3" data-bank={b.source}>
                <div className="min-w-0 flex-1">
                  <b className="text-[15px]">{b.name}</b>{b.shared && <span className="ml-2 text-[12px] text-state-inactive">Shared</span>}
                  <p className="truncate text-[13px] text-state-inactive">{b.questions.length} question{b.questions.length === 1 ? "" : "s"} · {[...new Set(b.questions.map((q) => QTYPE_LABEL[q.type]))].join(" · ")}</p>
                </div>
                {b.mine && <button type="button" onClick={() => setEditing({ id: b.id, name: b.name, shared: b.shared, questions: b.questions })} className={`${BTN_OUT} min-h-9`}>Edit</button>}
                <button type="button" disabled={busy} onClick={() => call({ action: "duplicate", id: b.id })} className={`${BTN_OUT} min-h-9`}>Duplicate</button>
                {b.mine && <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete "${b.name}"?`)) void call({ action: "delete", id: b.id }); }} className="text-[13px] font-semibold text-state-declined underline">Delete</button>}
              </div>
            )) : <p className="py-3 text-[13.5px] text-state-inactive">{k === "mine" ? "None yet — save a set from Ask Questions, or press New Bank." : "None shared yet."}</p>}
          </section>
        );
      })}
    </div>
  );
}
