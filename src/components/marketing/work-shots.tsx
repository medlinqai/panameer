import { ShotCard } from "@/components/learn/public/shared";

export function WorkRequestDraftShot() {
  const FILLED = [
    { label: "Title", value: "Oracle Cloud Procurement rollout support" },
    { label: "Dates", value: "6 Oct 2026 – 19 Feb 2027" },
    { label: "Budget", value: "Range, fixed price" },
    { label: "Location", value: "United States · Remote" },
  ];
  return (
    <ShotCard>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="text-[13px] font-semibold text-ink">
          Draft Work Request
        </span>
        <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-2">
          Draft
        </span>
      </div>

      {}
      <div className="mt-4 rounded-[12px] border border-dashed border-magenta/45 bg-magenta/[0.05] px-4 py-3">
        <span className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-ink">
            Paste your JD
          </span>
          <span className="rounded-full bg-magenta px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.07em] text-white">
            Fastest
          </span>
        </span>
        <span className="mt-1 block text-[11.5px] leading-[1.45] text-ink-2">
          Paste it in and we&rsquo;ll draft the Work Request from what it says.
        </span>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-2">
        Filled from your JD
      </p>
      <dl className="m-0 mt-2">
        {FILLED.map((f) => (
          <div
            key={f.label}
            className="grid grid-cols-[76px_1fr] items-baseline gap-3 border-b border-line py-[7px] last:border-b-0"
          >
            <dt className="text-[11px] uppercase tracking-[0.06em] text-ink-2">
              {f.label}
            </dt>
            <dd className="m-0 truncate text-[12.5px] font-semibold text-ink">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-[1.45] text-ink-2">
        Skills are read too — held until you pick a role and domain to check
        them against.
      </p>
    </ShotCard>
  );
}
