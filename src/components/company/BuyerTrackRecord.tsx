import type { TrackRecord } from "@/lib/buyer-track-record";

// Buyer Track Record block: real activity only; a company with no work orders reads "New buyer on Panameer".
const since = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/New_York" });

export function BuyerTrackRecord({ t, compact = false }: { t: TrackRecord; compact?: boolean }) {
  const facts = [
    { k: "Industry", v: t.industry },
    { k: "Size", v: t.size ? `${t.size} people` : null },
    { k: "Location", v: t.location },
    { k: "ERP used", v: t.erp },
  ].filter((f) => f.v);
  const stats = t.isNew
    ? []
    : [
        { k: "Work orders issued", v: String(t.issued) },
        { k: "Completed", v: String(t.completed) },
        { k: "Paid on time", v: t.paidOnTimePct == null ? "—" : `${t.paidOnTimePct}%` },
        { k: "Avg days to pay", v: t.avgDaysToPay == null ? "—" : String(t.avgDaysToPay) },
      ];
  return (
    <section data-buyer-track-record data-new={t.isNew || undefined} className={compact ? "mt-2 border-t border-line pt-2" : "mt-6 border border-line p-4"}>
      <p className={"flex flex-wrap items-center gap-2 font-bold " + (compact ? "text-[12.5px]" : "text-[16px]")}>
        Buyer Track Record
        {t.validated && <span className="border border-ink px-1.5 text-[10.5px] tracking-[0.06em]">VALIDATED ✓</span>}
        <span className="text-[12px] font-normal text-ink-3">Member since {since(t.memberSince)}</span>
      </p>
      {t.isNew ? (
        <p data-new-buyer className={"mt-1 text-ink-2 " + (compact ? "text-[12.5px]" : "text-[14px]")}>New buyer on Panameer</p>
      ) : (
        <dl className={"mt-2 grid gap-2 " + (compact ? "grid-cols-2 text-[12px] sm:grid-cols-4" : "grid-cols-2 text-[13.5px] sm:grid-cols-4")}>
          {stats.map((s) => (
            <div key={s.k}>
              <dt className="text-ink-3">{s.k}</dt>
              <dd className={"font-bold " + (compact ? "text-[14px]" : "text-[20px]")}>{s.v}</dd>
            </div>
          ))}
        </dl>
      )}
      {facts.length > 0 && <p className={"mt-2 text-ink-2 " + (compact ? "text-[12px]" : "text-[13px]")}>{facts.map((f) => `${f.k}: ${f.v}`).join(" · ")}</p>}
    </section>
  );
}
