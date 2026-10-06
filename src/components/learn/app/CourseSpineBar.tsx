import { blockLabel, type Spine } from "@/lib/learn-spine";

export function CourseSpineBar({ spine, title }: { spine: Spine | null; title: string }) {
  if (!spine || spine.blocks.length === 0) return null;

  return (
    <ul
      role="list"
      aria-label={`${title} — ${spine.courses} course${spine.courses === 1 ? "" : "s"}, ${spine.playableLessons} of ${spine.totalLessons} lessons ready`}
      className="flex h-6 w-full overflow-hidden rounded-[6px] bg-bg-soft"
    >
      {spine.blocks.map((b, i) => (
        <li
          key={`${b.courseId}-${b.state}-${i}`}
          title={blockLabel(b)}
          aria-label={blockLabel(b)}
          style={{ width: `${b.widthPct}%` }}
          className={
            // A HAIRLINE BETWEEN BLOCKS, NOT A GAP. A `gap` would stop the
            "h-full shrink-0 border-r border-white/70 last:border-r-0 " +
            (b.state === "watched"
              ? "bg-magenta"
              : b.state === "ready"
                ? "bg-magenta/25"
                : /* WHITE WITH A DASHED EDGE — "not shot yet" must read as */
                  "border-y border-dashed border-magenta/40 bg-white")
          }
        />
      ))}
    </ul>
  );
}
