import Link from "next/link";
import type { Figure } from "@/lib/figure";
import { isCounted } from "@/lib/figure";
import { UsageHive, type HiveCell } from "@/components/console/UsageHive";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";

// Usage hero in Health's look (2026-10-05): the shared AccountHero, honeycomb as the picture, no glow.
export function UsageHero({
  cells,
  stats,
  summary,
  scoreComplete,
}: {
  cells: HiveCell[];
  stats: { label: string; value: Figure }[];
  summary: string;
  scoreComplete: boolean;
}) {
  return (
    <AccountHero
      testId="usage-hero"
      picture={<UsageHive cells={cells} />}
      eyebrow="Usage"
      title="What's Happening Around You"
      kpis={stats.map((s) => ({ value: isCounted(s.value) ? s.value.toLocaleString("en-US") : "—", label: s.label.toUpperCase() }))}
      paragraph={<p data-usage-summary>{summary}</p>}
      actions={
        <>
          <Link href="/connect/invite" className={HERO_BTN}>Invite to Panameer</Link>
          <Link href="/profile" className={HERO_BTN_W}>{scoreComplete ? "View Your Profile" : "Complete Your Profile"}</Link>
        </>
      }
    />
  );
}
