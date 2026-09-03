import { blockLabel, type Spine } from "@/lib/learn-spine";

/**
 * THE COURSE SPINE BAR (`P1-J3-E364` WS-4) — one block per course, width
 * proportional to that course's lesson count.
 *
 * **SCOTT, 2026-09-02:** *"if there was a graphic that could show me [courses and
 * lessons] in a minute, that would really help me choose the right path
 * quickly."*
 *
 * ── ⚠⚠ THE NAME. `PathSpine` WAS ALREADY TAKEN AND I NEARLY DESTROYED IT ─────
 *
 * `E364` calls this graphic "the spine", but
 * `components/learn/app/PathSpine.tsx` has been the VERTICAL CURRICULUM ACCORDION
 * on `AppPath` since `brief_learn_app_shell` WS3 — a numbered node per course
 * with expandable lesson lists. It is a different component answering a different
 * question, and `AppPath` is explicitly out of scope for this brief.
 * ⚠ THE FIRST DRAFT OF THIS FILE OVERWROTE IT. `tsc` caught it because `AppPath`
 * passes `path` and this takes `spine`; it was restored from HEAD and this is the
 * renamed one. REPORTED at `E364` — two things called "spine" one directory apart
 * is a trap, and this comment is the sign on it.
 *
 * ── ⚠⚠ IT RENDERS NOTHING WHEN THE STRUCTURE COULD NOT BE RESOLVED ───────────
 *
 * `buildSpine` returns null and so does this. A plausible-looking bar over data
 * we could not resolve is the worst output of this feature, because a bar is
 * exactly what a learner trusts at a glance without reading a number.
 *
 * ── ⚠ EVERY BLOCK IS LABELLED TWICE, DELIBERATELY ────────────────────────────
 *
 * `title` for a mouse, `aria-label` for everything else. `P1-J3-E045` recorded
 * this exact lesson on the coverage row: a tooltip is a mouse-only affordance and
 * a phone never sees one.
 */
export function CourseSpineBar({ spine, title }: { spine: Spine | null; title: string }) {
  /* ⚠ NO BAR, NOT AN EMPTY BAR. See the header. */
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
            /* ⚠ A HAIRLINE BETWEEN BLOCKS, NOT A GAP. A `gap` would stop the
               widths summing to the bar, and the bar's whole claim is that its
               proportions are the path's proportions. */
            "h-full shrink-0 border-r border-white/70 last:border-r-0 " +
            (b.state === "watched"
              ? "bg-magenta"
              : b.state === "ready"
                ? "bg-magenta/25"
                : /* ⚠ WHITE WITH A DASHED EDGE — "not shot yet" must read as
                     absent, not as a third kind of progress. */
                  "border-y border-dashed border-magenta/40 bg-white")
          }
        />
      ))}
    </ul>
  );
}
