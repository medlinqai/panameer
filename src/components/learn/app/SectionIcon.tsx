import { BookOpen, Plus, Search, Pencil, Dot } from "lucide-react";
import { sectionKind, type SectionKind } from "@/lib/learn-sections";

/**
 * The four-part rhythm as a mark — grey book · green plus · blue magnifier ·
 * amber pencil, and a neutral dot for anything the title doesn't name.
 *
 * The derivation lives in `lib/learn-sections.ts` so `check:learn` can assert it
 * without rendering React, and so the "unmatched → neutral" rule is testable
 * rather than a claim in a comment.
 */
const MARKS: Record<SectionKind, { Icon: typeof BookOpen; bg: string; title: string }> = {
  overview: { Icon: BookOpen, bg: "bg-learn-slate", title: "Overview" },
  create: { Icon: Plus, bg: "bg-learn-green", title: "Create new" },
  find: { Icon: Search, bg: "bg-learn-blue", title: "Find existing" },
  change: { Icon: Pencil, bg: "bg-learn-gold", title: "Change existing" },
  /*
    ⚠ NEUTRAL, and visibly so. A pale dot rather than a fifth colour: the point
    of the set is that colour carries the verb, and giving "unknown" its own
    confident colour would make it look like a fifth verb.
  */
  other: { Icon: Dot, bg: "bg-line", title: "" },
};

export function SectionIcon({ title, className = "h-6 w-6" }: { title: string; className?: string }) {
  const kind = sectionKind(title);
  const { Icon, bg, title: hint } = MARKS[kind];
  return (
    <span
      title={hint || undefined}
      className={`${className} ${bg} grid shrink-0 place-items-center rounded-[8px]`}
    >
      <Icon
        className={kind === "other" ? "h-4 w-4 text-ink-2" : "h-3.5 w-3.5 text-white"}
        strokeWidth={kind === "other" ? 3 : 2.5}
        aria-hidden
      />
    </span>
  );
}
