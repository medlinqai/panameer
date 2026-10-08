import Link from "next/link";

export type LearnTab = "home" | "my-learning" | "paths" | "courses";

const TAB = "shrink-0 whitespace-nowrap border-b-2 py-[14px] text-[13.5px] font-semibold";
const IDLE = `${TAB} border-transparent text-ink-2 hover:text-magenta`;
const ACTIVE = `${TAB} border-magenta text-magenta-ink`;

export function LearnTabs({
  active,
  /** Capability, not a count — see the docblock. */
  teaches,
  /** TRUE ONLY ON `/learn`, where the two anchored sections actually exist. */
  onLearnHome = false,
}: {
  active: LearnTab;
  teaches: boolean;
  onLearnHome?: boolean;
}) {
  const anchor = (id: string) => (onLearnHome ? `#${id}` : `/learn/my#${id}`);

  return (
    // IT WRAPS. , AND THE ACTIVE TAB IS WHY (brief 9, 53d)
    <nav className="flex flex-wrap items-center gap-x-[26px] border-b border-line bg-white px-5 sm:px-6">
      <span className="shrink-0 border-r border-line py-[14px] pr-[22px] font-display text-[12px] font-bold tracking-[0.12em] text-ink">
        LEARN
      </span>

      {/* Home · All Learning Paths · My Learning (Scott 2026-10-08: no separate Courses tab — search finds courses). */}
      {active === "home" ? <span className={ACTIVE}>Home</span> : <Link href="/learn" className={IDLE}>Home</Link>}
      {active === "paths" ? <span className={ACTIVE}>All Learning Paths</span> : <Link href="/learn/paths" className={IDLE}>All Learning Paths</Link>}
      {active === "my-learning" ? <span className={ACTIVE}>My Learning</span> : <Link href="/learn/my" className={IDLE}>My Learning</Link>}

      <a href={anchor("certificates")} className={IDLE}>
        Certificates
      </a>

      {teaches && (
        <a href={anchor("teaching")} className={IDLE}>
          Teaching
        </a>
      )}
    </nav>
  );
}
