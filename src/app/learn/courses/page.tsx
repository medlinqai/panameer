import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getLearnCourses, courseTotals } from "@/lib/learn-courses";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { AUDIENCE_LABEL, AUDIENCE_PREFIX } from "@/lib/learn";

/**
 * ── ⚠⚠⚠ `/learn/courses` — A REAL PAGE (ruling 53d, brief 9) ────────────
 *
 * ⚠ **SCOTT HAS RULED:** *"Courses gets a real page of its own, five tabs each
 * naming a different place."* ⚠⚠ Until now this route was a **308 to
 * `/learn/paths`**, so **two of Learn's five tabs pointed at one page** — click
 * `Courses` and you arrived at Learning Paths with Learning Paths lit.
 *
 * ── ⚠⚠ WHAT THIS REPLACES, AND WHY THE 308 WAS RIGHT AT THE TIME ────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the whole of the old route:
 * //   import { permanentRedirect } from "next/navigation";
 * //   export default function Page() { permanentRedirect("/learn/paths"); }
 *
 * ⚠⚠⚠ **THE 308 WAS NOT A SHORTCUT — IT FIXED A REAL DEFECT AND THAT DEFECT
 * MUST NOT COME BACK.** Before `E364` WS-8 this route rendered **`PathCard` —
 * learning PATHS — under the heading "All Courses"**, from the same
 * `getLearnHome()` query `/learn/paths` used. **Two URLs, one page, one of them
 * named after a thing it did not show.** ⚠ `E362` found it and correctly
 * stopped; `E364` redirected it away.
 * ⚠⚠ **SO THIS PAGE EARNS THE URL BACK BY SHOWING COURSES.** `getLearnCourses`
 * queries `Course` and never `LearningPath`-as-a-card. **The redirect is only
 * retired because the page finally has its own content** — the measurement
 * ruling 53d demanded is in `learn-courses.ts`: a path is a JOB, a course is ONE
 * ORACLE APPLICATION.
 *
 * ── ⚠⚠⚠ IT STAYS PUBLIC. THIS IS `E316` AND IT IS LOAD-BEARING. ─────────
 *
 * ⚠⚠ `P1-J0-E316`: this route **MUST stay reachable signed out** — *"a gate
 * there turns the public hero's second CTA into a login wall."* ⚠ The old file's
 * closing note said the same of the redirect: *"its `public-routes.ts` entry
 * stays — a redirect a visitor cannot reach is not a redirect."*
 * ⚠⚠⚠ **THE ENTRY STILL STAYS, AND NOW IT GUARDS A PAGE RATHER THAN A HOP.**
 * `getSessionViewer()` is read for the TAB ROW ONLY; **nothing on this page is gated on
 * it**, and the catalogue renders identically to a visitor.
 *
 * ⚠ **THE TAB ROW IS SIGNED-IN ONLY**, the same rule `E627` set for
 * `/learn/paths`: *"My Learning"* is meaningless to somebody with no account,
 * and a row naming a page you cannot have is a row of doors onto walls.
 */
export const metadata = {
  title: "Courses · Learn · Panameer",
  description:
    "Every course in the Panameer catalogue, grouped by the learning path it belongs to.",
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
        {/*
          ⚠⚠ THE FIGURES ARE DERIVED FROM THE ROWS THIS PAGE DRAWS
          (`courseTotals`), so the header cannot disagree with the list beneath
          it — the defect `E585` names, avoided by construction rather than by
          checking.
          ⚠ THREE FIGURES, ALL MEASURED, ALL COUNTABLE. None is a dash because
          none is uncountable: every one of them is a row count.
          ⚠⚠⚠ THE EYEBROW IS NOT THE HEADLINE. `E628` shipped an eyebrow reading
          `LEARNING PATHS` above a headline reading `Learning Paths` and it had
          to be corrected; `THE CATALOGUE` is already taken by that page, so this
          one names its own grain.
        */}
        <PatternHeader
          eyebrow="EVERY COURSE"
          headline="Courses"
          lede="A course covers one Oracle application. A path is the job that strings several of them together."
          figures={[
            { label: "Courses", value: totals.courses },
            /*
              ⚠⚠ `Across Paths`, NOT `Paths They Sit In` — MEASURED AT 390px.
              ⚠ The longer label wrapped to THREE lines while `COURSES` took one
              and `WITH VIDEO` took two, so the three numbers sat at three
              different heights. `PatternHeader`'s `min-h-[2.4em]` reserves TWO
              lines (the fix `E629` made for `/learn`); a third line overflows it
              and the row goes ragged again.
              ⚠⚠⚠ THE FIX BELONGS IN THE LABEL, NOT IN THE COMPONENT. Raising
              the reserve to three lines would put a band of white space under
              every two-word label on all six pages that use this header, to
              serve one page's long phrase. **A row of numbers that do not share
              a baseline is harder to compare, which is the one thing a figure
              row is for.**
            */
            { label: "Across Paths", value: totals.paths },
            { label: "With Video", value: totals.playable },
          ]}
          move={
            <>
              {/*
                ⚠⚠ AT GENUINE ZERO, NAME THE FIRST MOVE (rule 4). ⚠ And the
                credit is a COUNT, never a compliment.
              */}
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
                {/* ⚠ `P2-A4-E611` — the audience carries its prefix and is
                    NEVER rendered as a difficulty. There is no level column. */}
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
                      {/*
                        ── ⚠⚠⚠ THREE COURSES IN THE CATALOGUE HAVE NO TITLE ───

                        ⚠ Recorded at `E611` in `PathSpine.tsx`: on
                        `end-user-beginners`, `end-user-erp` and
                        `end-user-implementers` the XLS collapsed *"Learning Path
                        = Course"* and left the course name blank.
                        ⚠⚠ **THE PATH'S TITLE IS NOT BORROWED TO FILL THE HOLE**
                        — `PathSpine` refused that because it *"would assert a
                        name the catalog does not have"*, and the same refusal
                        holds here. ⚠⚠⚠ **INSTEAD THE GROUPING CARRIES THE
                        IDENTITY:** the card sits under its path's heading, so an
                        untitled course reads as *"this path's course"* rather
                        than as a blank line. That is why this page groups.
                      */}
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
                      {/*
                        ⚠⚠ TWO COUNTS, AND THE SECOND ONLY WHEN IT DISAGREES
                        WITH THE FIRST. *"9 lessons · 4 with video"* is worth
                        saying; *"9 lessons · 9 with video"* is the same fact
                        twice. ⚠ A measured `0` is still printed — *"0 with
                        video"* is exactly what somebody deciding whether to open
                        this course needs to know (`E607`'s notice, same rule).
                      */}
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
