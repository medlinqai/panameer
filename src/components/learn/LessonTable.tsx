import Link from "next/link";
import type { LearnLessonRow } from "@/lib/learn-home";

export type LessonTableSection = {
  id: string;
  title: string;
  description: string | null;
  lessons: LearnLessonRow[];
};

/**
 * The lessons table (WS2; design ref Learn-course-page-design.png).
 *
 * ONE table per course, with sections as sub-headers INSIDE it, because the
 * design is one table and a course averages four sections. Rendering a separate
 * table per section repeated the column headers every few rows, which turned a
 * scannable list into a stack of small tables — visibly wrong the first time it
 * was screenshotted.
 *
 * The design draws a solid-magenta header over magenta-tinted rows. The brief
 * asks for "lighter than the solid-magenta table" and it is right: at 105 rows
 * that fill is a wall, and it makes every row look like a call to action when
 * the real one is the single lesson you're up to. So the structure is the
 * design's — Lesson · Description · Time, titles as magenta links — with the
 * weight moved out of the fill and into the type.
 *
 * The design's fourth column is "Notes", filled with lorem. Lesson has no notes
 * field, and inventing one to satisfy a placeholder would be building the mock
 * rather than the product — so the column carries COMPLETION, which the brief
 * asks for by name and which a learner returning to a path actually needs.
 */
export function LessonTable({
  pathSlug,
  sections,
  showSectionHeaders = true,
}: {
  pathSlug: string;
  sections: LessonTableSection[];
  showSectionHeaders?: boolean;
}) {
  const total = sections.reduce((n, s) => n + s.lessons.length, 0);
  if (total === 0) {
    return <p className="px-4 py-3 text-[14px] text-ink-2">No lessons here yet.</p>;
  }
  const named = showSectionHeaders && sections.length > 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-[14.5px]">
        <thead>
          <tr className="border-b-2 border-magenta/25 text-[12.5px] uppercase tracking-wide text-magenta">
            <th className="w-[40%] px-4 py-2.5 font-bold">Lesson</th>
            <th className="px-4 py-2.5 font-bold">Description</th>
            <th className="w-[86px] px-4 py-2.5 font-bold">Time</th>
            <th className="w-[92px] px-4 py-2.5 text-right font-bold">Done</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <SectionRows
              key={section.id}
              pathSlug={pathSlug}
              section={section}
              named={named}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionRows({
  pathSlug,
  section,
  named,
}: {
  pathSlug: string;
  section: LessonTableSection;
  named: boolean;
}) {
  return (
    <>
      {named && (
        <tr className="bg-bg-soft">
          <th colSpan={4} className="px-4 py-2 text-left">
            <span className="text-[13.5px] font-bold">{section.title}</span>
            {section.description && (
              <span className="ml-2 text-[13px] font-normal text-ink-2">
                {section.description}
              </span>
            )}
          </th>
        </tr>
      )}
      {section.lessons.map((l) => (
        <tr
          key={l.id}
          className={
            "border-b border-line last:border-0 " +
            (l.completed ? "bg-emerald-500/[0.05]" : "")
          }
        >
          <td className="px-4 py-3">
            <Link
              href={`/learn/${pathSlug}/${l.id}`}
              className="font-semibold text-magenta underline underline-offset-4 hover:text-magenta-dark"
            >
              {l.title}
            </Link>
            {!l.playable && (
              <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-black/[0.05] px-2 py-0.5 text-[11.5px] font-bold text-ink-2">
                Coming soon
              </span>
            )}
          </td>
          <td className="px-4 py-3 text-ink-2">
            <span className="line-clamp-2">{l.description ?? "—"}</span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-ink-2">{l.runTime ?? "—"}</td>
          <td className="px-4 py-3 text-right">
            {l.completed ? (
              <span className="whitespace-nowrap text-[14px] font-bold text-emerald-700">
                ✓ Done
              </span>
            ) : (
              <span className="text-[13px] text-ink-2">—</span>
            )}
          </td>
        </tr>
      ))}
    </>
  );
}
