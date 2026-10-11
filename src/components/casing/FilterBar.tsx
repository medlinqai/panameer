"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// WS-E007: one filter bar for Work and Shop lists — search + dropdowns, state in the URL, chips for active values, Clear All.
export type FilterOption = { value: string; label: string; count?: number; group?: string };
export type FilterDef = {
  key: string;
  label: string;
  options: FilterOption[];
  /** WS-E008: a soft magenta pulse until this viewer opens it once (remembered in this browser). */
  pulseKey?: string;
  footer?: ReactNode;
};

const noop = () => () => {};
const seen = (k: string) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch {
    return true;
  }
};

export function FilterBar({ filters, placeholder, keep = [] }: { filters: FilterDef[]; placeholder: string; keep?: string[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const [q, setQ] = useState(params?.get("q") ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const box = useRef<HTMLDivElement>(null);
  // Browser-only memory of "opened once"; the server renders no pulse.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const pulsing = (f: FilterDef) => hydrated && !!f.pulseKey && !opened[f.key] && !seen(f.pulseKey);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params?.toString() ?? "");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("show");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const toggle = (f: FilterDef) => {
    setOpen((o) => (o === f.key ? null : f.key));
    if (f.pulseKey) {
      try { localStorage.setItem(f.pulseKey, "1"); } catch {}
      setOpened((p) => ({ ...p, [f.key]: true }));
    }
  };
  const active = filters.flatMap((f) => {
    const v = params?.get(f.key);
    const o = v ? f.options.find((x) => x.value === v) : null;
    return o ? [{ key: f.key, label: `${f.label}: ${o.label}` }] : [];
  });
  const query = params?.get("q");

  return (
    <div ref={box} data-filter-bar className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="min-w-[200px] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: q.trim() || null });
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 w-full border border-line bg-white px-3 text-[13.5px] outline-none focus:border-ink" />
        </form>
        {filters.map((f) => {
          const v = params?.get(f.key);
          const on = !!v && f.options.some((o) => o.value === v);
          const groups = [...new Set(f.options.map((o) => o.group ?? ""))];
          return (
            <div key={f.key} className="relative">
              <button
                type="button"
                data-filter={f.key}
                aria-expanded={open === f.key}
                onClick={() => toggle(f)}
                className={
                  "h-10 border bg-white px-3 text-[13px] font-semibold " +
                  (on ? "border-ink text-ink" : pulsing(f) ? "border-magenta text-magenta-dark motion-safe:animate-[pm-pulse_1.8s_ease-in-out_infinite]" : "border-line text-ink")
                }
              >
                {f.label} <span className="text-ink-3">▾</span>
              </button>
              {open === f.key && (
                <div role="menu" className="absolute left-0 z-30 mt-1 max-h-[60vh] w-[280px] overflow-auto border border-line bg-white py-1 shadow-lg">
                  {groups.map((g) => (
                    <div key={g || "all"}>
                      {g && <p className="px-3 pb-1 pt-2 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-3">{g.toUpperCase()}</p>}
                      {f.options.filter((o) => (o.group ?? "") === g).map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={v === o.value}
                          onClick={() => { go({ [f.key]: v === o.value ? null : o.value }); setOpen(null); }}
                          className={"flex w-full items-center justify-between px-3 py-2 text-left text-[13.5px] hover:bg-surface-hover " + (v === o.value ? "font-bold" : "")}
                        >
                          <span>{o.label}</span>
                          {o.count !== undefined && <span className="text-[12px] tabular-nums text-ink-3">{o.count}</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                  {f.footer && <div className="mt-1 border-t border-line px-3 py-2 text-[13px]">{f.footer}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {(active.length > 0 || query) && (
        <div data-filter-chips className="mt-2 flex flex-wrap items-center gap-2">
          {query && <Chip label={`Search: ${query}`} onClear={() => { setQ(""); go({ q: null }); }} />}
          {active.map((a) => <Chip key={a.key} label={a.label} onClear={() => go({ [a.key]: null })} />)}
          <button type="button" onClick={() => { setQ(""); go(Object.fromEntries([...filters.map((f) => [f.key, null]), ["q", null]].filter(([k]) => !keep.includes(k as string)))); }} className="text-[13px] font-semibold underline underline-offset-4">Clear All</button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-ink px-2 py-1 text-[12.5px] font-semibold">
      {label}
      <button type="button" aria-label={`Remove ${label}`} onClick={onClear} className="text-ink-2 hover:text-ink">×</button>
    </span>
  );
}
