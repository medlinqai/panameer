import Link from "next/link";
import { StatTile, StatRow } from "@/components/console/StatTile";
import { RequestValidationAction } from "@/components/console/RequestValidationAction";

export type ProfileCriterion = {
  label: string;
  met: boolean;
  note: string;
  action: { label: string; href: string } | null;
  pending?: boolean;
  control?: "request-validation" | null;
};

export type ProfileChecklistInput = {
  completeness: number;
  pausedAt: Date | null;
  validationStatus: string;
  visible: boolean;
  counts: {
    skills: number;
    employers: number;
    projects: number;
    packages: number;
    serviceProducts: number;
  };
  certCount: number;
};

export function buildProfileCriteria(
  p: ProfileChecklistInput,
  opts: { visible: boolean; validated: boolean; validationRequested: boolean }
): { criteria: ProfileCriterion[]; metCount: number } {
  const { visible, validated, validationRequested } = opts;
  const criteria: ProfileCriterion[] = [
    {
      label: "Profile complete enough to be visible",
      met: visible,
      note:
        p.pausedAt
          ? "Paused by you — resume from Settings when you're ready."
          : visible
            ? "Buyers can find you, and your service products are purchasable."
            : "Buyers cannot find you yet, and your service products are not on sale.",
      action:
        visible
          ? null
          : 
            { label: "Finish Your Profile", href: "/join/provider?step=finish" },
    },
    {
      label: "Work history added",
      met: p.counts.employers > 0,
      note: "Buyers read work history before anything else on your profile.",
      action:
        p.counts.employers > 0
          ? null
          : {
              label: "Add Work History",
              href: "/join/provider?step=tell_us&return=review",
            },
    },
    {
      label: "At least one service product listed",
      met: p.counts.serviceProducts > 0,
      note: "A service product is what a buyer actually buys.",
      action:
        p.counts.serviceProducts > 0
          ? null
          : { label: "Add a Service Product", href: "/my-services" },
    },
    {
      label: "Identity validated by Panameer",
      met: validated,
      note: validated
        ? "Granted by Panameer on the quality of your work."
        : validationRequested
          ? "You've asked for validation. Panameer reviews it — we'll let you know."
          : "Only Panameer can grant this, and it is never sold. Some buyers choose to see validated providers only.",
      action: null,
      pending: validationRequested,
      control: validated || validationRequested ? null : ("request-validation" as const),
    },
  ];
  const metCount = criteria.filter((c) => c.met).length;
  return { criteria, metCount };
}

export function ProfileChecklist({
  p,
  visible,
  validated,
  validationRequested,
}: {
  p: ProfileChecklistInput;
  visible: boolean;
  validated: boolean;
  validationRequested: boolean;
}) {
  const { criteria, metCount } = buildProfileCriteria(p, {
    visible,
    validated,
    validationRequested,
  });
  return (
    <>
      {}
      <StatTile label="Profile" span={2}>
        {}
        {}
        <Link
          href="/connect/score"
          className="inline-block font-display text-[19px] font-bold leading-tight text-magenta hover:underline"
        >
          See Your Profile Score &rarr;
        </Link>

        {}
        <p className="mt-3 text-[14px] font-bold">
          {p.pausedAt
            ? "Your profile is paused"
            : visible
              ? "Photo, identity and the required details — all met."
              : "Not visible yet — some required details are missing."}
        </p>

        {}
        <ul className="mt-4 space-y-3">
          {criteria.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5">
              {}
              <span
                aria-hidden
                className={
                  "mt-[3px] grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[11px] font-black text-white " +
                  (c.met
                    ? "bg-emerald-500"
                    : c.pending
                      ? "bg-ink-2"
                      : "bg-ink-2/30")
                }
              >
                {c.met ? "✓" : c.pending ? "…" : "!"}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">
                  {c.label}
                </span>
                <span className="block text-[13px] leading-relaxed text-ink-2">
                  {c.note}
                </span>
                {}
                {!c.met && c.action && (
                  <Link
                    href={c.action.href}
                    className="mt-1.5 inline-block text-[13.5px] font-bold text-magenta hover:underline"
                  >
                    {c.action.label}
                  </Link>
                )}
                {}
                {c.control === "request-validation" && (
                  <RequestValidationAction status={p.validationStatus} />
                )}
              </span>
            </li>
          ))}
        </ul>
        {}
        {}
        <p className="mt-3 text-[12.5px] text-ink-2">
          {metCount} of {criteria.length} met.
        </p>

        {/* ── FACT 4 — THE INVENTORY ──────────────────────────────────── */}
        <div className="mt-4">
          <StatRow label="Skills" value={String(p.counts.skills)} />
          {}
          <StatRow label="Companies" value={String(p.counts.employers)} />
          <StatRow label="Projects" value={String(p.counts.projects)} />
          {}
          <StatRow
            label="Certifications"
            value={String(p.certCount)}
          />
        </div>
      </StatTile>
    </>
  );
}
