"use client";

import { LocationFields, type LocationValue } from "@/components/onboarding/LocationFields";

// LS-E003/E005: a company's addresses, each with what it's used for. Shared by buyer + seller registration and Company › Addresses.
export type LocRow = LocationValue & { id?: string | null; line2?: string | null; corporate: boolean; billTo: boolean; shipTo: boolean; remitTo: boolean };

export const newLoc = (country?: string | null, remit = false): LocRow => ({ country: country ?? undefined, corporate: true, billTo: true, shipTo: true, remitTo: remit });

export function locsProblem(rows: LocRow[], opts: { buyer?: boolean; seller?: boolean }): string | null {
  if (!rows.length) return "Add an address";
  if (rows.some((r) => !r.line1?.trim() || !r.country)) return "Each address needs a country and street";
  if (opts.buyer !== false && !rows.some((r) => r.billTo)) return "Tick Bill To on at least one address";
  if (opts.buyer !== false && !rows.some((r) => r.shipTo)) return "Tick Ship To / Work Location on at least one address";
  if (opts.seller && !rows.some((r) => r.remitTo)) return "Tick Remit To on at least one address";
  return null;
}

export function LocationsBlock({
  rows,
  onChange,
  buyer = true,
  seller = false,
  work,
  onWork,
}: {
  rows: LocRow[];
  onChange: (rows: LocRow[]) => void;
  buyer?: boolean;
  seller?: boolean;
  /** Index of the Ship To that is "where I work" (buyers). */
  work?: number;
  onWork?: (i: number) => void;
}) {
  const shipTos = rows.map((r, i) => (r.shipTo ? i : -1)).filter((i) => i >= 0);
  const set = (i: number, patch: Partial<LocRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const uses: { key: "corporate" | "billTo" | "shipTo" | "remitTo"; label: string }[] = [
    { key: "corporate", label: "Corporate" },
    ...(buyer ? [{ key: "billTo" as const, label: "Bill To" }, { key: "shipTo" as const, label: "Ship To / Work Location" }] : []),
    ...(seller ? [{ key: "remitTo" as const, label: "Remit To" }] : []),
  ];
  return (
    <div className="space-y-4" data-locations>
      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} data-location className="border border-line p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[14px] font-bold">Address {i + 1}{i === 0 ? " *" : ""}</p>
            {rows.length > 1 && (
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-[13px] font-semibold underline underline-offset-4">Remove</button>
            )}
          </div>
          <LocationFields value={r} onChange={(patch) => set(i, patch)} withStreet compact />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label={`What address ${i + 1} is used for`}>
            {uses.map((u) => (
              <label key={u.key} className="flex cursor-pointer items-center gap-2 text-[14px]">
                <input type="checkbox" checked={r[u.key]} onChange={(e) => set(i, { [u.key]: e.target.checked } as Partial<LocRow>)} className="h-4 w-4 accent-magenta" />
                {u.label}
              </label>
            ))}
          </div>
          {onWork && shipTos.length > 1 && r.shipTo && (
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-[14px] font-semibold">
              <input type="radio" name="where-i-work" checked={work === i} onChange={() => onWork(i)} className="h-4 w-4 accent-magenta" />
              This is where I work
            </label>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { ...newLoc(rows[0]?.country, seller), corporate: false, billTo: false, shipTo: buyer }])} className="text-[14px] font-semibold text-magenta-dark underline underline-offset-4" data-add-location>
        + Add Another Address
      </button>
    </div>
  );
}

/** "425 Town Plaza Ave, Ponte Vedra Beach FL · Corporate · Bill To · Ship To · Where I work" */
export function locLine(r: LocRow, opts: { work?: boolean; seller?: boolean } = {}) {
  const where = [r.line1, [r.city, r.state].filter(Boolean).join(" ")].filter((x) => x && x.trim()).join(", ");
  const uses = [r.corporate && "Corporate", r.billTo && "Bill To", r.shipTo && "Ship To", opts.seller && r.remitTo && "Remit To", opts.work && "Where I work"].filter(Boolean);
  return [where || "—", ...uses].join(" · ");
}
