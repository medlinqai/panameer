"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

/** A dashboard/funnel stat tile. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "magenta" | "green" | "amber";
}) {
  const ring =
    tone === "magenta"
      ? "border-magenta/30"
      : tone === "green"
        ? "border-emerald-500/30"
        : tone === "amber"
          ? "border-amber-500/30"
          : "border-line";
  return (
    <div className={"rounded-brand border bg-white p-5 " + ring}>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-2">
        {label}
      </p>
      <p className="mt-1 text-[30px] font-extrabold tracking-[-1px]">{value}</p>
      {hint && <p className="mt-1 text-[13px] text-ink-2">{hint}</p>}
    </div>
  );
}

/** Section heading for a console page. */
export function AdminHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
    </div>
  );
}

/** Search input. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="w-full max-w-sm rounded-[12px] border border-line bg-white px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-magenta"
    />
  );
}

/**
 * Admin data fetch — fails LOUD (brief_M): a read error surfaces an error state,
 * never a silent empty list. `reload` re-fetches (used after a mutation).
 */
export function useAdminFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(url);
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        setError(b.error ?? `Request failed (${r.status})`);
        setData(null);
        return;
      }
      setData(await r.json());
    } catch {
      setError("Network error — could not load data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/** Consistent loading + fail-loud error states for a console page body. */
export function AdminState({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-brand border border-red-500/30 bg-red-500/5 p-5 text-[14px] text-red-700">
        <p className="font-bold">Couldn&apos;t load this data.</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }
  if (loading) {
    return <p className="text-[14px] text-ink-2">Loading…</p>;
  }
  return null;
}
