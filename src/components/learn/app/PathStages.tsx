import Link from "next/link";
import { StepDisc, StepConnector, type StepState } from "@/components/casing/StepDisc";
import type { AppPathView } from "@/lib/learn-path-app";

type Stage = {
  label: string;
  done: boolean;
  href: string | null;
  unavailable?: string;
};

export function pathStages(p: {
  slug: string;
  enrolled: boolean;
  percent: number;
  testExists: boolean;
  testReady: boolean;
  testPassed: boolean;
  certificateEarned: boolean;
  certificateUrl: string | null;
}): Stage[] {
  return [
    { label: "Enrolled", done: p.enrolled, href: null },
    { label: `${p.percent}% Courses`, done: p.percent === 100, href: "#path-courses" },
    // RULING 54 — LINKED WHENEVER THE SET IS PUBLISHED, AT ANY PROGRESS.
    {
      label: "Path Test",
      done: p.testPassed,
      href: p.testReady ? `/learn/${p.slug}/test` : null,
      // NO TEST ON THE PATH AT ALL IS A DIFFERENT STATE FROM A TEST THAT IS
      ...(p.testExists ? {} : { unavailable: "This path has no test." }),
    },
    // THE CERTIFICATE'S ONLY DESTINATION IS THE ONE IT HAS WHEN IT EXISTS.
    {
      label: "Certificate",
      done: p.certificateEarned,
      href: p.certificateEarned ? p.certificateUrl : null,
      // THE REASON SAYS WHY IT IS UNAVAILABLE, NOT HOW IT IS NORMALLY
      ...(p.testExists ? {} : { unavailable: "No test on this path, so none to earn." }),
    },
  ];
}

/** WHICH STAGE THE MEMBER IS STANDING ON. EXPORTED, AND HERE IS WHY */
export function currentStageIndex(stages: Stage[]): number {
  return stages.findIndex((s) => !s.done && !s.unavailable);
}

export function PathStages({ path }: { path: AppPathView }) {
  const stages = pathStages({
    slug: path.slug,
    enrolled: path.enrolled,
    percent: path.percent,
    testExists: path.test.exists,
    testReady: path.test.ready,
    testPassed: path.test.passed,
    certificateEarned: path.certificate.earned,
    certificateUrl: path.certificate.verifyUrl,
  });

  // WITHOUT THE `unavailable` CLAUSE, FINISHING THE COURSES ON A
  const currentIndex = currentStageIndex(stages);

  return (
    // IT WRAPS. IT DOES NOT SCROLL, AND THAT IS 's RULING
    <nav
      aria-label="Your progress through this path"
      className="mb-5 flex flex-wrap items-center gap-x-0.5 gap-y-1 rounded-brand border border-line bg-white px-3 py-1.5"
    >
      {stages.map((s, i) => {
        const state: StepState = s.unavailable
          ? "unavailable"
          : i === currentIndex
            ? "current"
            : s.done
              ? "done"
              : "upcoming";
        // THE LABEL CARRIES THE STATE FOR A SCREEN READER, because the disc is
        const spoken = s.unavailable
          ? `${s.label} — not available on this path. ${s.unavailable}`
          : `${s.label} — ${
              state === "done" ? "done" : state === "current" ? "you are here" : "not yet"
            }`;
        const inner = (
          <>
            <StepDisc n={i + 1} state={state} />
            <span
              className={
                "whitespace-nowrap text-[13px] font-semibold " +
                (state === "current"
                  ? "text-magenta"
                  : state === "done"
                    ? "text-ink"
                    : "text-ink-2")
              }
            >
              {s.label}
              {/* THE REASON RENDERS. THAT IS THE WHOLE POINT. */}
              {s.unavailable && (
                <span className="mt-0.5 block whitespace-normal text-[11px] font-normal leading-snug text-ink-2">
                  {s.unavailable}
                </span>
              )}
            </span>
            <span className="sr-only">{spoken}</span>
          </>
        );

        return (
          <div key={s.label} className="flex shrink-0 items-center">
            {i > 0 && <StepConnector />}
            {/* A LINK ONLY WHERE THERE IS SOMEWHERE TO GO. The `<span>` branch */}
            {s.href ? (
              <Link
                href={s.href}
                aria-current={state === "current" ? "step" : undefined}
                className="flex min-h-[44px] shrink-0 items-center gap-2 px-2.5 transition-colors hover:bg-ink/5"
              >
                {inner}
              </Link>
            ) : (
              <span
                aria-current={state === "current" ? "step" : undefined}
                className="flex min-h-[44px] shrink-0 items-center gap-2 px-2.5"
              >
                {inner}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
