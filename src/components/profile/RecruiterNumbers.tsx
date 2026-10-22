"use client";

import { useState } from "react";

// MR-E003: the two numbers recruiters ask for; blank = Panameer derives them from your Oracle Cloud projects (shown with ≈).
export function RecruiterNumbers({ years, implementations, derivedYears, derivedImplementations }: { years: number | null; implementations: number | null; derivedYears: number | null; derivedImplementations: number | null }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = async (field: "oracleCloudYears" | "implementationsCount", raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw);
    if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= 60)) { setError("Enter a whole number from 0 to 60, or leave it blank."); return; }
    const r = await fetch("/api/provider/recruiter-numbers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: v }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setError(r?.ok ? null : j.error ?? "Couldn't save — try again.");
    setSaved(!!r?.ok);
  };
  const input = "mt-1 w-28 border border-line bg-white px-3 py-2 text-[14px]";
  return (
    <section className="mb-5 border-t border-ink pt-3.5" data-recruiter-numbers>
      <h2 className="text-[18px] font-extrabold">Oracle Cloud Experience</h2>
      <p className="mt-1 text-[13px] text-ink-2">Recruiters ask for these. Leave blank and we&apos;ll estimate them from your Oracle Cloud projects (shown with ≈).</p>
      <div className="mt-3 flex flex-wrap gap-6">
        <label className="text-[13px] font-semibold">Oracle Cloud Years
          <input type="number" min={0} max={60} defaultValue={years ?? ""} placeholder={derivedYears != null ? `≈${derivedYears}` : ""} onBlur={(e) => save("oracleCloudYears", e.target.value)} className={`block ${input}`} />
        </label>
        <label className="text-[13px] font-semibold">Implementations
          <input type="number" min={0} max={60} defaultValue={implementations ?? ""} placeholder={derivedImplementations != null ? `≈${derivedImplementations}` : ""} onBlur={(e) => save("implementationsCount", e.target.value)} className={`block ${input}`} />
        </label>
      </div>
      {error ? <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p> : saved ? <p className="mt-2 text-[12.5px] text-state-inactive">Saved</p> : null}
    </section>
  );
}
