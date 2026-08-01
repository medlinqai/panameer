import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLearnPath } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { getTestState } from "@/lib/learn-assessment";
import { TestRunner } from "@/components/learn/TestRunner";

/**
 * The path test (brief_learn_experience WS5).
 *
 * GATED ON FINISHING THE PATH, not on enrolment. The credential says you know
 * the material, so the honest precondition is having worked through it — and a
 * test you can sit before watching anything would make the badge worthless the
 * first time somebody noticed.
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
  const finished = path.lessons > 0 && path.completed >= path.lessons;

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

      {!finished ? (
        <div className="mt-6 rounded-brand border border-line p-6">
          <p className="text-[15.5px] font-bold">Finish the path first.</p>
          <p className="mt-1.5 text-[14.5px] text-ink-2">
            You&apos;ve completed {path.completed} of {path.lessons} lessons. The test
            covers the whole path, and passing it issues a certificate that says you
            know this material — so it waits until you&apos;ve been through it.
          </p>
          <Link
            href={`/learn/${path.slug}`}
            className="mt-4 inline-block rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Back to the Path
          </Link>
        </div>
      ) : state.passed ? (
        <div className="mt-6 rounded-brand border-2 border-emerald-500/40 bg-emerald-500/[0.06] p-6">
          <p className="text-[16px] font-bold">You&apos;ve already passed this test.</p>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Best score {state.best}%. Your certificate is on your profile under
            Certifications.
          </p>
          <Link
            href={`/learn/${path.slug}`}
            className="mt-4 inline-block text-[14px] font-bold text-magenta hover:underline"
          >
            ← Back to {path.title}
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
