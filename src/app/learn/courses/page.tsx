import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getLearnCourses, courseTotals } from "@/lib/learn-courses";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { AUDIENCE_LABEL, AUDIENCE_PREFIX } from "@/lib/learn";

export const metadata = {
  title: "Courses · Learn · Panameer",
  description:
    "Every course in the Panameer catalog, grouped by the learning path it belongs to.",
};

export default async function Page() {
  const viewer = await getSessionViewer();
  const groups = await getLearnCourses();
  const totals = courseTotals(groups);
  const teaches = viewer ? await viewerTeaches(viewer) : false;

  return (
    <>
      {viewer && <LearnTabs active="courses" teaches={teaches} />}

      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
        {}
        <PatternHeader
          eyebrow="EVERY COURSE"
          headline="Courses"
          lede="A course covers one Oracle application. A path is the job that strings several of them together."
          figures={[
            { label: "Courses", value: totals.courses },
            { label: "Across Paths", value: totals.paths },
            { label: "With Video", value: totals.playable },
          ]}
          move={
            <>
              {}
              {totals.courses === 0 ? (
                <>Nothing is published yet.</>
              ) : (
                <>
                  Every course belongs to one path, so the path is where you enrol — the course is
                  what you watch.
                </>
              )}
            </>
          }
          primary={{ label: "Browse Learning Paths", href: "/learn/paths" }}
        />

        <div className="mt-6 space-y-6">
          {groups.map((g) => (
            <section key={g.pathSlug}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-[17px] font-bold tracking-[-0.2px] text-ink">
                  <Link href={`/learn/${g.pathSlug}`} className="hover:text-magenta">
                    {g.pathTitle}
                  </Link>
                </h2>
                {/* — the audience carries its prefix and is */}
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-ink-2">
                  {`${AUDIENCE_PREFIX} ${AUDIENCE_LABEL[g.audience] ?? g.audience}`}
                  {g.group ? ` · ${g.group}` : ""}
                </span>
                <span className="text-[12px] text-ink-2">
                  {g.courses.length} course{g.courses.length === 1 ? "" : "s"}
                </span>
              </div>

              <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {g.courses.map((c, i) => (
                  <li key={c.id}>
                    <Link
                      href={c.href}
                      className="flex h-full min-h-[44px] flex-col rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
                    >
                      {/* THREE COURSES IN THE CATALOGUE HAVE NO TITLE */}
                      {c.title.trim() ? (
                        <b className="font-display text-[14.5px] font-bold leading-[1.3] text-ink">
                          {c.title}
                        </b>
                      ) : (
                        <b className="font-display text-[14.5px] font-bold leading-[1.3] text-ink-2">
                          Course {i + 1}
                        </b>
                      )}
                      {c.summary && (
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2">
                          {c.summary}
                        </p>
                      )}
                      {/* TWO COUNTS, AND THE SECOND ONLY WHEN IT DISAGREES */}
                      <span className="mt-auto pt-2 text-[11.5px] text-ink-2">
                        {c.lessons} lesson{c.lessons === 1 ? "" : "s"}
                        {c.playable !== c.lessons ? ` · ${c.playable} with video` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
