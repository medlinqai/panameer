import { ShotCard } from "@/components/learn/public/shared";

export function ProviderProfileShot() {
  const SKILLS = [
    { name: "Oracle Procurement Cloud", meta: "8 yrs · current", w: 92 },
    { name: "Supplier Qualification", meta: "5 yrs · current", w: 71 },
    { name: "Self-Service Procurement", meta: "6 yrs · 2 yrs ago", w: 54 },
    { name: "Inventory Cloud", meta: "2 yrs · 4 yrs ago", w: 23 },
  ];
  return (
    <ShotCard>
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span
          aria-hidden
          className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-magenta/10 font-display text-[13px] font-bold text-magenta"
        >
          PI
        </span>
        <span className="min-w-0">
          {}
          <span className="block text-[14px] font-semibold leading-[1.25] text-ink">
            Paul Ingrao
          </span>
          <span className="mt-[1px] block text-[11.5px] text-ink-2">
            Procurement · Oracle Fusion Cloud
          </span>
        </span>
        {}
        <span className="ml-auto whitespace-nowrap text-[11.5px] font-semibold text-ink">
          $145–$185/hr
        </span>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-2">
        Built from your work history
      </p>
      <ul className="m-0 mt-2 list-none p-0">
        {SKILLS.map((s) => (
          <li key={s.name} className="py-[7px]">
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">
                {s.name}
              </span>
              <span className="whitespace-nowrap text-[10.5px] text-ink-2">
                {s.meta}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-[5px] block h-[5px] rounded-full bg-[#eef0f6]"
            >
              <span
                className="block h-full rounded-full bg-magenta"
                style={{ width: `${s.w}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-3 text-[11px] text-ink-2">
        Weighted by how deep and how recent — not a self-scored checklist.
      </p>
    </ShotCard>
  );
}

/**
 * STEP 4 — THE THREE THINGS A PROVIDER CAN PUBLISH.
 *
 * ⚠ THE THREE ROWS ARE `PackageKind`, NOT AN INVENTION: `HOURS` (a named person's
 * time, `HOURLY` or `RECURRING`), `DELIVERABLE` (a defined scope, `FIXED`) and
 * `DEPLOYABLE` (an agent under a standing SOW, `RECURRING`). Every pricing shape
 * shown is the one that enum's own doc comments specify.
 *
 * ⚠⚠ IT IS THE PROVIDER'S VIEW, AND THAT IS THE WHOLE REASON IT IS NOT
 * `GetTheTalentShot`. That component draws the same three kinds with BUYER actions
 * — "Interview", "Review & hire", "Deploy". On a step called *Create Service
 * Products* those would show the buyer doing the work.
 *
 * ⚠ SO THE ACTIONS HERE ARE THE PROVIDER'S OWN STATES — `Published`, `Draft` — which
 * is exactly what `/settings/packages` shows, and `Package.status` is a real column
 * with those values.
 *
 * ⚠ ONE ROW IS DELIBERATELY A DRAFT. Publishing is a real gate, and a shot where
 * everything is already live would imply it is not.
 */
export function ServiceProductsShot() {
  const ROWS = [
    {
      kind: "Hours",
      name: "Fusion Procurement advisory",
      price: "$165/hr",
      live: true,
    },
    {
      kind: "Deliverable",
      name: "Supplier Portal rollout",
      price: "$18,400 fixed",
      live: true,
    },
    {
      kind: "Deployable",
      name: "Contract price-alert agent",
      price: "$400/mo",
      live: false,
    },
  ];
  return (
    <ShotCard>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="text-[13px] font-semibold text-ink">
          Your service products
        </span>
        <span className="text-[11px] text-ink-2">3</span>
      </div>
      <ul className="m-0 list-none p-0">
        {ROWS.map((r) => (
          <li
            key={r.name}
            className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line py-[11px] last:border-b-0"
          >
            <span className="min-w-0">
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-magenta">
                {r.kind}
              </span>
              <span className="mt-[2px] block truncate text-[12.5px] font-semibold text-ink">
                {r.name}
              </span>
              <span className="mt-[1px] block text-[11px] text-ink-2">
                {r.price}
              </span>
            </span>
            <span
              className={
                "whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] " +
                (r.live
                  ? "bg-[#e6f5ee] text-[#137a51]"
                  : "border border-line text-ink-2")
              }
            >
              {r.live ? "Published" : "Draft"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-ink-2">
        Set the scope and the price once — publish when you are ready.
      </p>
    </ShotCard>
  );
}
