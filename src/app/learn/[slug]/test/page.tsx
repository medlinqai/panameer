import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLearnPath } from "@/lib/learn-home";
import { getSessionViewer } from "@/lib/session";
import { getTestState } from "@/lib/learn-assessment";
import { TestRunner } from "@/components/learn/TestRunner";
import { prisma } from "@/lib/prisma";
import { recommendNext, testOutPicks } from "@/lib/learn-next";
import { WhatsNext } from "@/components/learn/WhatsNext";
import { getSkillAreas } from "@/lib/skill-area-store";
import { TestPreview } from "@/components/learn/TestPreview";
import { canAdminister } from "@/lib/access";
import { BackLink } from "@/components/console/BackLink";

export default async function TestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const viewer = await getSessionViewer();
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/learn/${slug}/test`)}`);

  const path = await getLearnPath(slug, viewer.userId);
  if (!path) notFound();

  const state = await getTestState(viewer.userId, path.id);
  // L-E056: the pass screen's name line and its What's Next chooser (computed here, shown after a pass).
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { first_name: true, last_name: true } });
  const holderName = `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim();
  const [rec, testPicks, areas] = await Promise.all([recommendNext(viewer.userId, { after: path.id }), testOutPicks(viewer.userId, { after: path.id }), getSkillAreas()]);
  const labelOf = (code: string | null) => (code === "START" ? "Start Here" : code ? areas.find((a) => a.code === code)?.label ?? code : null);
  const next = <WhatsNext picks={rec.picks} testPicks={testPicks} skillMatched={rec.skillMatched} areaLabel={labelOf} />;
  // L-E042: admins preview a draft (or published) test — answers shown, nothing counted, no certificate.
  if (preview && canAdminister(viewer))
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10">
        <BackLink href={`/learn/${path.slug}`} label={path.title} />
        <h1 className="mt-3 font-display text-[27px] font-bold tracking-[-0.5px]">{path.title} — Test Preview</h1>
        <TestPreview pathId={path.id} pathSlug={path.slug} />
      </div>
    );

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
        <div className="mt-6 border-2 border-ink bg-[#C9CDDC]/25 p-6">
          <p className="text-[16px] font-bold">You&apos;ve already passed this test.</p>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Best score {state.best}%. Your certificate is on your profile under
            Credentials.
          </p>
          <BackLink href={`/learn/${path.slug}`} label={path.title} />
        </div>
      ) : !state.ready ? (
        // NOT READY IS NOT AN ERROR (WS4)
        <div className="mt-6 rounded-brand border border-line p-6">
          <p className="text-[15.5px] font-bold">The test isn&apos;t open yet.</p>
          <p className="mt-1.5 max-w-lg text-[14.5px] text-ink-2">
            You&apos;ve finished the path — the questions for it are still being
            written and checked. Nothing is lost: the moment it opens, your
            completed lessons are all the credit you need to sit it.
          </p>
          <Link
            href={`/learn/${path.slug}`}
            className="mt-4 inline-block bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
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
            <TestRunner pathId={path.id} pathSlug={path.slug} pathTitle={path.title} holderName={holderName} next={next} />
          </div>
        </>
      )}
    </div>
  );
}
