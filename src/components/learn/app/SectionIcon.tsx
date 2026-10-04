import { BookOpen, Plus, Search, Pencil, Dot } from "lucide-react";
import { sectionKind, type SectionKind } from "@/lib/learn-sections";

const MARKS: Record<SectionKind, { Icon: typeof BookOpen; bg: string; title: string }> = {
  overview: { Icon: BookOpen, bg: "bg-learn-slate", title: "Overview" },
  create: { Icon: Plus, bg: "bg-learn-green", title: "Create New" },
  find: { Icon: Search, bg: "bg-learn-blue", title: "Find Existing" },
  change: { Icon: Pencil, bg: "bg-learn-gold", title: "Change Existing" },
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
