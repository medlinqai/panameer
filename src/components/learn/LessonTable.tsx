import Link from "next/link";
import type { LearnLessonRow } from "@/lib/learn-home";

export type LessonTableSection = {
  id: string;
  title: string;
  description: string | null;
  lessons: LearnLessonRow[];
};

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
  const sectionDone = section.lessons.filter((l) => l.completed).length;
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
            {}
            {sectionDone > 0 && (
              <span
                className={
                  "ml-2 text-[12.5px] font-bold " +
                  (sectionDone === section.lessons.length
                    ? "text-emerald-700"
                    : "text-ink-2")
                }
              >
                {sectionDone === section.lessons.length
                  ? "✓ Section complete"
                  : `${sectionDone} of ${section.lessons.length} done`}
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
                {/* ⚠ `P2-A4-E611` — the state, not a promise. ⚠ SUPERSEDED (`E164`):
                    //   Coming soon */}
                {l.stateLabel}
              </span>
            )}
          </td>
          <td className="px-4 py-3 text-ink-2">
            <span className="line-clamp-2">{l.description ?? "—"}</span>
          </td>
          {/*
            ⚠⚠ `P2-A4-E611` — A MISSING LENGTH IS OMITTED, NOT DASHED.
            ⚠ Scott, 2026-09-23: *"a missing length is a missing fact, not an
            uncountable one."* A dash is reserved for a figure we cannot count;
            an untimed lesson is one nobody has timed, and the honest rendering
            of that is an empty cell.
            ⚠ `runTime` ARRIVES ALREADY JUDGED — `shownRunTime` returned null
            for every source that is not `vimeo`, so this component does not
            know the rule and must not learn it.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <td className="…">{l.runTime ?? "—"}</td>
          */}
          <td className="px-4 py-3 whitespace-nowrap text-ink-2">{l.runTime}</td>
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
