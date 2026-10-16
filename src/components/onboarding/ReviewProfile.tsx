"use client";

// Scott 10-16: one Review step for buyer and seller — the top of their profile (big photo) over Company and Locations.
import { Avatar } from "@/components/Avatar";
import type { LocRow } from "@/components/onboarding/LocationsBlock";
import type { LocationValue } from "@/components/onboarding/LocationFields";

export type ReviewSection = "person" | "company" | "locations";
export type ReviewLocation = { where: string; uses: string[] };

export function locParts(r: LocRow | LocationValue, opts: { seller?: boolean; work?: boolean } = {}): ReviewLocation {
  const row = r as Partial<LocRow>;
  const where = [r.line1, [r.city, r.state].filter(Boolean).join(", "), r.postalCode].filter((x) => x && String(x).trim()).join(", ") || "—";
  const uses = [row.corporate && "Corporate", !opts.seller && row.billTo && "Bill To", !opts.seller && row.shipTo && "Ship To", opts.seller && row.remitTo && "Remit To", opts.work && "Where I work"].filter(Boolean) as string[];
  return { where, uses };
}

/** "Miami, FL" from the first address, for the header line. */
export const placeOf = (r?: LocationValue | null) => (r ? [r.city, r.state].filter(Boolean).join(", ") : "");

export function ReviewProfile({
  person,
  companyLine,
  notLive,
  companyRows,
  locations,
  next,
  onEdit,
}: {
  person: { firstName: string; lastName: string; title: string; photoUrl: string | null; phone: string; email: string };
  companyLine: string;
  notLive?: boolean;
  companyRows: { label: string; value: string }[];
  locations: ReviewLocation[];
  next: string;
  onEdit: (s: ReviewSection) => void;
}) {
  const edit = (s: ReviewSection) => (
    <button type="button" onClick={() => onEdit(s)} className="text-[13.5px] font-bold text-magenta-dark hover:underline">Edit</button>
  );
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6" data-review-profile>
      <section className="grid grid-cols-1 items-center gap-5 border border-line bg-surface p-6 sm:grid-cols-[auto_1fr_auto]">
        <div className="aspect-square h-[88px] w-[88px] shrink-0 sm:h-[112px] sm:w-[112px] [&>span]:!h-full [&>span]:!w-full">
          <Avatar firstName={person.firstName} lastName={person.lastName} photoUrl={person.photoUrl} size={112} />
        </div>
        <div className="min-w-0">
          <p className="text-[24px] font-extrabold leading-tight">{`${person.firstName} ${person.lastName}`.trim() || "—"}</p>
          {person.title && <p className="mt-0.5 text-[15.5px]">{person.title}</p>}
          {companyLine && <p className="mt-1.5 text-[14px] text-ink-2">{companyLine}</p>}
          <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
            {person.phone && <span><b className="font-semibold text-ink">Phone</b> {person.phone}</span>}
            {person.email && <span><b className="font-semibold text-ink">Email</b> {person.email}</span>}
          </p>
          {notLive && <span className="mt-2.5 inline-block border border-magenta px-1.5 py-px text-[11px] font-bold text-magenta-dark">Not live yet</span>}
        </div>
        <div className="order-first justify-self-end sm:order-none sm:self-start">{edit("person")}</div>
      </section>

      <section className="grid gap-2">
        <div className="flex items-baseline justify-between border-b border-line pb-1.5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em]">Company</h2>
          {edit("company")}
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[150px_1fr]">
          {companyRows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-ink-2 sm:mt-0 sm:text-[14px] sm:font-normal sm:normal-case sm:tracking-normal">{r.label}</dt>
              <dd className="min-w-0">{r.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-2">
        <div className="flex items-baseline justify-between border-b border-line pb-1.5">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em]">{locations.length > 1 ? "Locations" : "Location"}</h2>
          {edit("locations")}
        </div>
        {locations.map((l, i) => (
          <div key={i} className="grid gap-1 text-[14px]">
            <p>{l.where}</p>
            {l.uses.length > 0 && (
              <p className="flex flex-wrap gap-1.5">
                {l.uses.map((u) => <span key={u} className="border border-line px-1.5 text-[11.5px] font-semibold text-ink-2">{u}</span>)}
              </p>
            )}
          </div>
        ))}
      </section>

      <p className="bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900">{next}</p>
    </div>
  );
}
