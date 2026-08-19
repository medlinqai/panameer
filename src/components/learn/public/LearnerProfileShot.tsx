import { ShotCard, Avatar } from "@/components/learn/public/shared";

/**
 * SECTION 5 — the profile, which is the point: what you finish and what you teach land on the
 * same record buyers already search.
 *
 * ⚠ EVERY NUMBER HERE IS AN ILLUSTRATION AND MUST STAY ONE. `7 certificates`,
 * `1,240 learners taught` and `4.9` are drawn, not queried, and nothing on this page may ever
 * render a real count — a real count of 0 on a sales page is worse than a drawing. Same status
 * as the named people on `/`'s GetTheTalentShot.
 */
const CHIPS = ["P2P with AI Agents", "Self-Service Procurement", "Contract Lifecycle", "+4 more"];
const STATS = [
  ["7", "certificates"],
  ["1,240", "learners taught"],
  ["4.9", "mentor rating"],
] as const;

export function LearnerProfileShot() {
  return (
    <ShotCard>
      <div className="flex items-center gap-3.5">
        <Avatar initials="AR" tone="ink" size={44} />
        <div className="min-w-0">
          <p className="font-display text-[16px] font-bold leading-[1.2] text-ink">Alex Rivera</p>
          <p className="mt-[3px] text-[12px] text-ink-2">Oracle P2P · Austin, TX</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <span
            key={c}
            className="rounded-full border border-line bg-[#fafbfd] px-2.5 py-1 text-[11px] text-ink-2"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-line pt-4">
        {STATS.map(([v, l]) => (
          <div key={l} className="min-w-0">
            <p className="font-display text-[19px] font-bold leading-none tracking-[-0.4px] text-ink">
              {v}
            </p>
            <p className="mt-1.5 text-[10.5px] leading-[1.35] text-ink-2">{l}</p>
          </div>
        ))}
      </div>
    </ShotCard>
  );
}
