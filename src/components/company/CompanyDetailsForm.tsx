"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TAX_LABELS } from "@/lib/tax-types";

export function CompanyDetailsForm({
  initial,
}: {
  initial: {
    name: string;
    legalName: string | null;
    taxType: string | null;
    country: string | null;
    stateOfFiling: string | null;
    ein: string | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name ?? "",
    legalName: initial.legalName ?? "",
    taxType: initial.taxType ?? "",
    country: initial.country ?? "",
    stateOfFiling: initial.stateOfFiling ?? "",
    ein: initial.ein ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const body = { ...form, taxType: form.taxType === "" ? null : form.taxType };
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(result?.error ?? "That didn't save.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const FIELDS: { key: keyof typeof form; label: string; hint?: string }[] = [
    { key: "name", label: "Company Name" },
    { key: "legalName", label: "Legal Name", hint: "If it differs from the name buyers see." },
    { key: "country", label: "Country" },
    { key: "stateOfFiling", label: "State of Filing" },
    { key: "ein", label: "EIN / Tax Registration" },
  ];

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="block text-[13px] font-semibold text-ink">{f.label}</span>
          {f.hint && (
            <span className="block text-[12.5px] leading-snug text-ink-2">{f.hint}</span>
          )}
          <input
            value={form[f.key]}
            onChange={set(f.key)}
            className="mt-1 min-h-[44px] w-full rounded-[10px] border border-line bg-white px-3 text-[14px] text-ink"
          />
        </label>
      ))}

      {}
      <label className="block">
        <span className="block text-[13px] font-semibold text-ink">Business Type</span>
        <select
          value={form.taxType}
          onChange={set("taxType")}
          className="mt-1 min-h-[44px] w-full rounded-[10px] border border-line bg-white px-3 text-[14px] text-ink"
        >
          <option value="">Not set</option>
          {Object.entries(TAX_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-[13px] font-semibold text-emerald-700">Saved.</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[44px] items-center rounded-full bg-magenta px-5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {}
        {busy ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
