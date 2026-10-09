import Link from "next/link";
import { ScrollRow } from "@/components/casing/ScrollRow";

export type LearnTab = "home" | "my-learning" | "paths" | "courses" | "certificates" | "teaching";

const TAB = "shrink-0 whitespace-nowrap border-b-2 py-[14px] text-[13.5px] font-semibold";
const IDLE = `${TAB} border-transparent text-ink-2 hover:text-magenta`;
const ACTIVE = `${TAB} border-magenta text-magenta-ink`;

// T-E001: every tab opens its own page (Certificates and Teaching were #anchors that jumped down the page).
export function LearnTabs({
  active,
  /** Capability, not a count. */
  teaches,
}: {
  active: LearnTab;
  teaches: boolean;
}) {
  const tabs: [LearnTab, string, string][] = [
    ["home", "Home", "/learn"],
    ["paths", "All Learning Paths", "/learn/paths"],
    ["my-learning", "My Learning", "/learn/my"],
    ["certificates", "Certificates", "/learn/certificates"],
    ...(teaches ? [["teaching", "Teaching", "/learn/teaching"] as [LearnTab, string, string]] : []),
  ];
  return (
    <ScrollRow as="nav" label="Learn" className="items-center gap-x-[22px] border-b border-line bg-white px-5 sm:gap-x-[26px] sm:px-6">
      <span className="shrink-0 border-r border-line py-[14px] pr-[22px] font-display text-[12px] font-bold tracking-[0.12em] text-ink">
        LEARN
      </span>
      {tabs.map(([key, label, href]) =>
        active === key ? (
          <span key={key} aria-current="page" className={ACTIVE}>{label}</span>
        ) : (
          <Link key={key} href={href} className={IDLE}>{label}</Link>
        )
      )}
    </ScrollRow>
  );
}
