import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLearnPath } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { getTestState } from "@/lib/learn-assessment";
import { TestRunner } from "@/components/learn/TestRunner";
import { BackLink } from "@/components/console/BackLink";

/**
 * The path test (brief_learn_experience WS5).
 *
 * ── ⚠⚠⚠ THERE IS NO COMPLETION GATE, AND THIS PAGE USED TO DISAGREE WITH THE
 *        API ABOUT THAT (`P2-A4-E611`, Q1) ───────────────────────────────────
 *
 * ⚠⚠ SCOTT, quoted in `api/learn/test/[pathId]/route.ts` since `P1-ALL-E034`:
 * *"I want to allow every panameerian to take the certification without having
 * taken the courses."* ⚠ That route's header says in as many words: **"There is
 * NO COMPLETION GATE and Scott wants none. Nothing here reads `LessonProgress`,
 * and nothing may start to."**
 *
 * ⚠⚠⚠ THIS PAGE BLOCKED AT `completed >= lessons` ANYWAY. Two files, opposite
 * rules, and the page's was the one a member met. ⚠ It was also UI-only and
 * bypassable by posting to the API directly, so it stopped honest people and
 * nobody else. ⚠ Scott, 2026-09-23: *"no completion gate on the path test.
 * Delete the check to match the API and Scott's quote."*
 *
 * ⚠⚠ WHAT IS **NOT** BEING RELAXED: `E607`'s refusal on an UNREADY path. A path
 * with no playable lesson still has no test, because there is nothing the test
 * could be about — `notReadyResponse` in the API is untouched. ⚠ THAT IS A
 * DIFFERENT RULE: one is about what the MEMBER has done, the other about
 * whether the MATERIAL exists.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   GATED ON FINISHING THE PATH, not on enrollment. The credential says you know
 * //   the material, so the honest precondition is having worked through it — and a
 * //   test you can sit before watching anything would make the badge worthless the
 * //   first time somebody noticed.
 * //   const finished = path.lessons > 0 && path.completed >= path.lessons;
 * //   {!finished ? (
 * //     <div className="mt-6 rounded-brand border border-line p-6">
 * //       <p className="text-[15.5px] font-bold">Finish the path first.</p>
 * //       … "You've completed {path.completed} of {path.lessons} lessons." …
 * //     </div>
 * //   ) : state.passed ? (
 */
export default async function TestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getSessionViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/learn/${slug}/test`)}`);

  const path = await getLearnPath(slug, viewer.userId);
  if (!path) notFound();

  const state = await getTestState(viewer.userId, path.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10">
      <nav className="text-[13.5px] text-ink-2">
        <Link href="/learn" className="font-semibold hover:text-magenta">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${path.slug}`} className="font-semibold hover:text-magenta">
          {path.title}
        </Link>
      </nav>

      <h1 className="mt-3 font-display text-[27px] font-bold tracking-[-0.5px] sm:text-[32px]">
        {path.title} — Test
      </h1>

      {state.passed ? (
        <div className="mt-6 rounded-brand border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-6">
          <p className="text-[16px] font-bold">You&apos;ve already passed this test.</p>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Best score {state.best}%. Your certificate is on your profile under
            Certifications.
          </p>
          <BackLink href={`/learn/${path.slug}`} label={path.title} />
        </div>
      ) : !state.ready ? (
        /*
          ── ⚠ NOT READY IS NOT AN ERROR (WS4) ────────────────────────────────

          Before the review gate this branch did not exist: the page rendered the
          runner, the runner fetched, and a path with no question set produced a
          503 and a red box. Now it says what is true. Two states, one message,
          deliberately: whether the set is MISSING or merely unreviewed is not the
          learner's business, and telling them "a draft exists" would invite
          "so let me see it".

          ⚠ NO THRESHOLD OR ATTEMPT COUNT PRINTED HERE. There is no assessment
          row, so `getTestState`'s 70/3 fallbacks are not this path's rules — and
          printing them would be the literal `check:learn-assessment` forbids.
        */
        <div className="mt-6 rounded-brand border border-line p-6">
          <p className="text-[15.5px] font-bold">The test isn&apos;t open yet.</p>
          <p className="mt-1.5 max-w-lg text-[14.5px] text-ink-2">
            You&apos;ve finished the path — the questions for it are still being
            written and checked. Nothing is lost: the moment it opens, your
            completed lessons are all the credit you need to sit it.
          </p>
          <Link
            href={`/learn/${path.slug}`}
            className="mt-4 inline-block rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Back to the Path
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[15px] text-ink-2">
            {state.questionCount > 0
              ? `${state.questionCount} questions · ${state.threshold}% to pass · attempt ${state.attemptsUsed + 1} of ${state.maxAttempts}`
              : `${state.threshold}% to pass · attempt ${state.attemptsUsed + 1} of ${state.maxAttempts}`}
          </p>
          <div className="mt-6">
            <TestRunner pathId={path.id} pathSlug={path.slug} pathTitle={path.title} />
          </div>
        </>
      )}
    </div>
  );
}
