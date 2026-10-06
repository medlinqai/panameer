"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAX_LABELS } from "@/lib/tax-types";

// Company Details, edited in place (same pattern as My Profile): square inputs, Save / Cancel.
type Init = {
  name: string; legalName: string | null; taxType: string | null; country: string | null; stateOfFiling: string | null;
  ein: string | null; industryId: string | null; website: string | null; description: string | null;
};
const MAX = 600;
const INPUT = "mt-1 min-h-[44px] w-full border border-line bg-surface px-3 text-[14px] text-ink focus:border-ink focus:outline-none";

export function CompanyDetailsEditor({ initial, industries }: { initial: Init; industries: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ""])) as Record<keyof Init, string>);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ field: string; message: string } | null>(null);
  const [match, setMatch] = useState<{ kind: string; name: string | null } | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const set = (k: keyof Init) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const done = () => {
    router.replace("/company#details", { scroll: false });
    router.refresh();
  };
  async function save(e: React.FormEvent | null, onMatch?: "join" | "distinct") {
    e?.preventDefault();
    setBusy(true);
    setMatch(null);
    setError(null);
    setFieldErr(null);
    const body = {
      name: f.name, legalName: f.legalName, taxType: f.taxType || null, country: f.country || null, stateOfFiling: f.stateOfFiling || null,
      ein: f.ein || null, industryId: f.industryId || null, website: f.website || null, description: f.description || null,
      ...(onMatch ? { onMatch } : {}),
    };
    const r = await fetch("/api/company", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (r?.status === 409) {
      const b = (await r.json().catch(() => ({}))) as { match?: { kind: string; name: string | null } };
      if (b.match) return setMatch(b.match);
    }
    if (r?.ok && onMatch === "join") {
      const b = (await r.json().catch(() => ({}))) as { joinedName?: string | null };
      return setJoined(b.joinedName ?? "that company");
    }
    if (!r?.ok) {
      const b = (await r?.json().catch(() => ({}))) as { error?: string; field?: string } | undefined;
      if (b?.field && b.error) return setFieldErr({ field: b.field, message: b.error });
      setError(
        b?.error ??
          (r ? `The server couldn't save your changes (HTTP ${r.status}). Your entries are still here — try again.` : "Couldn't reach Panameer. Check your connection; your entries are still here.")
      );
      return;
    }
    done();
  }
  const text = (k: keyof Init, label: string, hint?: string) => (
    <label className="block">
      <span className="block text-[13px] font-semibold">{label}</span>
      {hint && <span className="block text-[12.5px] text-ink-3">{hint}</span>}
      <input value={f[k]} onChange={set(k)} className={INPUT} name={k} aria-invalid={fieldErr?.field === k || undefined} />
      <FieldMsg field={k} err={fieldErr} />
    </label>
  );
  return (
    <form onSubmit={save} data-details-editor className="mt-3 grid gap-3.5 sm:grid-cols-2">
      {text("name", "Company name")}
      {text("legalName", "Legal name", "If it differs from the name buyers see.")}
      <label className="block">
        <span className="block text-[13px] font-semibold">Business type</span>
        <select value={f.taxType} onChange={set("taxType")} className={INPUT} name="taxType">
          <option value="">Not set</option>
          {Object.entries(TAX_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-[13px] font-semibold">Industry</span>
        <select value={f.industryId} onChange={set("industryId")} className={INPUT} name="industryId" aria-invalid={fieldErr?.field === "industryId" || undefined}>
          <option value="">Not set</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <FieldMsg field="industryId" err={fieldErr} />
      </label>
      {text("country", "Country")}
      {text("stateOfFiling", "State of filing")}
      {text("ein", "EIN / Tax registration", "Shown only to Panameer, never to buyers.")}
      {text("website", "Website")}
      <label className="block sm:col-span-2">
        <span className="flex justify-between text-[13px] font-semibold">
          Description <span className="font-normal text-ink-3">{f.description.length}/{MAX}</span>
        </span>
        <span className="block text-[12.5px] text-ink-3">What the company does and for whom. Buyers read this on every proposal.</span>
        <textarea value={f.description} onChange={set("description")} maxLength={MAX} rows={4} className={`${INPUT} py-2`} name="description" />
        <FieldMsg field="description" err={fieldErr} />
      </label>
      {error && <p role="alert" className="text-[13px] font-semibold text-magenta-dark sm:col-span-2">{error}</p>}
      {match && (
        <div data-company-match={match.kind} className="border-l-2 border-magenta py-2 pl-3.5 text-[14px] sm:col-span-2">
          <p className="font-semibold">
            {match.kind === "tin"
              ? "This tax ID is already registered to a company on Panameer. Ask its admin to add you?"
              : `${match.name} is already on Panameer. Ask to join ${match.name} instead?`}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => save(null, "join")} className="min-h-[40px] bg-ink px-4 text-[13px] font-bold text-surface">
              Ask to Join
            </button>
            <button type="button" disabled={busy} onClick={() => save(null, "distinct")} className="min-h-[40px] border border-ink bg-surface px-4 text-[13px] font-bold text-ink">
              This Isn&apos;t Us
            </button>
          </div>
        </div>
      )}
      {joined && (
        <p role="status" data-join-sent className="border-l-2 border-ink py-2 pl-3.5 text-[14px] sm:col-span-2">
          Request sent. {joined === "that company" ? "Its admin" : `${joined}'s admin`} will approve it; your own company page hasn&apos;t changed.
        </p>
      )}
      <div className="flex gap-2.5 sm:col-span-2">
        <button type="submit" disabled={busy} className="min-h-[44px] bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-60">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={done} className="min-h-[44px] border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldMsg({ field, err }: { field: string; err: { field: string; message: string } | null }) {
  if (err?.field !== field) return null;
  return (
    <span role="alert" data-field-error={field} className="mt-1 block text-[12.5px] font-semibold text-magenta-dark">
      {err.message}
    </span>
  );
}
