/**
 * §2's GRAPHIC — the six steps of Learn, drawn as NESTED CONTAINERS.
 *
 * ── ⚠ THE NESTING IS THE ARGUMENT, NOT THE DECORATION ────────────────────────
 *
 * Scott's six steps (brief_learn_public_spine WS2, verbatim): FIRST enroll in learning path 1 ·
 * SECOND take course 1 · THIRD watch all the lessons within course 1 · FOURTH move thru course
 * "X" · FIFTH take the Learning Path Certification · SIXTH move thru all remaining learning
 * paths.
 *
 * A six-across row of equal chips is the obvious way to draw six steps and it is the WRONG way
 * here, because it flattens the one structure this section exists to teach: a path CONTAINS
 * courses, a course CONTAINS lessons, and the certificate is at PATH level. Drawn flat, step 5
 * looks like a sixth course. So:
 *
 *   ┌ LEVEL 1 — LEARNING PATH ───────────────────────┐
 *   │  ① enroll in a learning path                   │
 *   │  ┌ LEVEL 2 — COURSE ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
 *   │  │  ② take course 1                         │  │
 *   │  │  ③ watch every lesson in the course      │  │
 *   │  │  ↻ ④ repeat for every remaining course   │  │
 *   │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
 *   │  ⑤ SIT THE LEARNING PATH CERTIFICATION         │  ← magenta, inside the PATH box
 *   └────────────────────────────────────────────────┘
 *   ⑥ then move through the remaining learning paths     ← OUTSIDE the path box
 *
 * ⚠ THE COMPOSITION IS NOT MINE AND IS NOT NEGOTIABLE — it is the approved mockup
 * (`2. Claude Sub-Files/mockups/learn_public_spine_2026-08-21.html`), Scott 2026-08-21: "this
 * needs a few corrections, but we can do that tomorrow. this is good."
 *
 * ⚠ `X` IS A VARIABLE. Step 4 means *repeat for every remaining course*, so it is drawn as a
 * LOOP LINE with a circular arrow, not as a course literally named "X".
 *
 * ⚠ THE CERTIFICATION IS AT PATH LEVEL. `LearnAssessment` is `@unique` on
 * `learning_path_id` — one test per path, never per course (`P1-J3-E004`). Step 5 therefore
 * sits inside the magenta path box and BELOW the dashed course box. Drawing it anywhere else
 * would contradict the schema.
 *
 * ⚠ NO SEVENTH STEP FOR SECTIONS. The schema has 170 `Section` rows between Course and Lesson;
 * Scott's model treats them as grouping subheadings with no progress of their own, so they are
 * named in step 3's sub-line ("Level 3") and given no box.
 *
 * ⚠ IT DOES NOT REPLACE `<PathProgressShot />` — that one still belongs to the surviving
 * `Learning paths` sell section further down the page.
 *
 * ⚠ EVERY NUMBER AND LABEL HERE IS REAL TEXT, NOT `aria-hidden`. The six steps are this
 * section's CONTENT, not an illustration of it; only the circular-arrow glyph is decorative.
 */

/** ⚠ INLINE SVG, NEVER A GLYPH — `↻ ⟳ ⭯` all failed to render on real boxes. */
function LoopArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px] flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden
      focusable="false"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** One numbered step inside a box. `tone` is magenta for step 1 (the path itself). */
function Chip({
  n,
  tone = "ink",
  title,
  sub,
}: {
  n: number;
  tone?: "ink" | "magenta";
  title: string;
  sub: string;
}) {
  return (
    <div className="mt-[9px] flex items-start gap-2.5 rounded-[11px] border border-line bg-white px-3 py-2.5">
      <span
        className={
          "mt-[1px] grid h-[22px] w-[22px] flex-none place-items-center rounded-full font-display text-[11px] font-bold leading-none text-white " +
          (tone === "magenta" ? "bg-magenta" : "bg-ink")
        }
      >
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-[1.35] text-ink">{title}</span>
        <span className="mt-[2px] block text-[12px] leading-[1.4] text-ink-2">{sub}</span>
      </span>
    </div>
  );
}

/** The pill that labels a box, hung on its top edge. */
function BoxTag({ children, tone }: { children: string; tone: "path" | "course" }) {
  return (
    <span
      className={
        "absolute left-4 rounded-full px-2.5 py-[3px] font-display text-[10.5px] font-bold uppercase leading-none tracking-[0.12em] text-white " +
        (tone === "path" ? "-top-[11px] bg-magenta" : "-top-[10px] bg-[#6f2b8e]")
      }
    >
      {children}
    </span>
  );
}

export function SixStepShot() {
  return (
    <div className="rounded-[20px] border border-line bg-white p-[26px] pb-[22px] shadow-[0_18px_44px_-30px_rgba(23,19,31,0.5)]">
      <p className="font-display text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#9a93a9]">
        Level 1 — Learning Path
      </p>

      {/* LEVEL 1 — the path. Solid magenta, because it is the unit that certifies. */}
      <div className="relative mt-2.5 rounded-[16px] border-2 border-magenta bg-[#fffdff] px-3.5 pb-4 pt-3.5">
        <BoxTag tone="path">Learning path</BoxTag>

        <Chip
          n={1}
          tone="magenta"
          title="Enroll in a learning path"
          sub="Your overall area of study — a functional area."
        />

        {/* LEVEL 2 — the course. Dashed and INSIDE the path box, because it is contained. */}
        <div className="relative mt-4 rounded-[13px] border-[1.5px] border-dashed border-[#b98fd0] bg-white px-3 pb-[15px] pt-[13px]">
          <BoxTag tone="course">Level 2 — course</BoxTag>

          <Chip
            n={2}
            title="Take course 1"
            sub="A course explains one application and its transactions."
          />
          <Chip
            n={3}
            title="Watch every lesson in the course"
            sub="Level 3 — how to create, change and find a transaction."
          />

          {/* Step 4 is the LOOP, not a fifth box — see the header note about "X". */}
          <p className="mt-2.5 flex items-center gap-[7px] text-[11.5px] font-bold text-[#8a5aa6]">
            <LoopArrow />
            <span>4&nbsp;&nbsp;Repeat for every remaining course in the path</span>
          </p>
        </div>

        {/* Step 5 — PATH level, below the course box, inside the path box. */}
        <div className="mt-4 flex items-center gap-2.5 rounded-[12px] border-[1.5px] border-magenta bg-[linear-gradient(90deg,#fdf2fd,#ffffff)] px-3.5 py-3">
          <span className="grid h-[24px] w-[24px] flex-none place-items-center rounded-full bg-magenta font-display text-[11.5px] font-bold leading-none text-white">
            5
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold leading-[1.35] text-ink">
              Sit the Learning Path Certification
            </span>
            <span className="mt-[2px] block text-[12px] leading-[1.4] text-ink-2">
              One test per path — not per course.
            </span>
          </span>
        </div>
      </div>

      {/* Step 6 — OUTSIDE the path box entirely. That is the point of it. */}
      <div className="mt-[13px] flex items-center gap-2.5 border-t border-dashed border-line pt-[13px]">
        <span className="grid h-[24px] w-[24px] flex-none place-items-center rounded-full bg-ink font-display text-[11.5px] font-bold leading-none text-white">
          6
        </span>
        <span className="text-[12.5px] leading-[1.45] text-ink-2">
          Then move through the remaining learning paths.
        </span>
      </div>
    </div>
  );
}
