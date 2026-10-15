"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationsBlock, locLine, locsProblem, newLoc, type LocRow } from "@/components/onboarding/LocationsBlock";

// LS-E005: Company › Addresses — admins edit the list and its uses; members see it and pick where they work.
export function CompanyAddresses({ initial, admin, seller, buyer, workAddressId }: { initial: LocRow[]; admin: boolean; seller: boolean; buyer: boolean; workAddressId: string | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<LocRow[]>(initial.length ? initial : [newLoc(null, seller)]);
  const [work, setWork] = useState(workAddressId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const post = async (body: object) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/company/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; locations?: LocRow[] };
    setBusy(false);
    if (!r?.ok) return setMsg(j.error ?? "That didn't save.");
    if (j.locations) setRows(j.locations);
    setMsg("Saved.");
    router.refresh();
  };
  const problem = locsProblem(rows, { buyer, seller });
  return (
    <div className="mt-4 space-y-4" data-company-addresses>
      {admin ? (
        <>
          <LocationsBlock rows={rows} onChange={setRows} buyer={buyer} seller={seller} />
          <div className="flex items-center gap-3">
            <button type="button" disabled={busy || !!problem} onClick={() => post({ locations: rows, seller })} className="bg-ink px-6 py-3 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40">{busy ? "Saving…" : "Save Addresses"}</button>
            {(problem || msg) && <span role="status" className="text-[13px] text-ink-2">{problem ?? msg}</span>}
          </div>
        </>
      ) : (
        <ul className="border-t border-line">
          {rows.filter((r) => r.line1).map((r) => (
            <li key={r.id ?? r.line1!} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-[14.5px]">
              <span>{locLine(r, { seller, work: r.id === work })}</span>
              {buyer && r.shipTo && r.id && r.id !== work && (
                <button type="button" disabled={busy} onClick={async () => { await post({ workAddressId: r.id }); setWork(r.id!); }} className="text-[13px] font-semibold underline underline-offset-4">This is where I work</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
