import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { learnCatalog } from "@/lib/learn-catalog";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { NotifyMe } from "@/components/learn/NotifyMe";
import { pathState, PICK_NEXT_HREF } from "@/lib/learn-state";
import { recommendNext } from "@/lib/learn-next";

export const metadata = { title: "Ready to Test · Panameer" };
export const dynamic = "force-dynamic";

const BTN_K = "inline-flex min-h-12 items-center justify-center bg-ink px-6 text-[15px] font-semibold text-surface hover:bg-ink-hover";
const BTN = "inline-flex min-h-12 items-center justify-center border border-ink px-6 text-[15px] font-semibold hover:bg-surface-hover";

// L-E045: finished means finished — every lesson that's out is watched, so the next step is the test (or the next path).
export default async function ReadyPage({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = await guardPage("authenticated");
  const { slug } = await params;
  const [[p], teaches] = await Promise.all([learnCatalog(viewer.userId, { slug }), viewerTeaches(viewer)]);
  if (!p) notFound();
  const state = pathState(p);
  if (state === "IN_PROGRESS" || state === "NEW") redirect(p.mine?.next ? `/learn/${slug}/${p.mine.next.id}` : `/learn/${slug}`);
  const m = p.mine;
  const top = (await recommendNext(viewer.userId, { after: p.id })).picks[0] ?? null;
  return (
    <>
      <LearnTabs active="paths" teaches={teaches} />
      <main className="mx-auto w-full max-w-xl px-4 py-12 text-center" data-ready-to-test>
        <span aria-hidden className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-ink text-[40px] font-bold text-surface">✓</span>
        <p className="mt-5 text-[11px] font-semibold tracking-[0.12em] text-magenta">{p.title.toUpperCase()}</p>
        <h1 className="mt-1 text-[30px] font-bold">{state === "CERTIFIED" ? "You're Certified" : "You're Ready to Test"}</h1>
        <p className="mt-3 text-[15.5px] text-ink-2">
          You&apos;ve watched every lesson that&apos;s out{m ? ` (${m.done} of ${m.total})` : ""}.
          {m?.soon ? ` ${m.soon} more ${m.soon === 1 ? "is" : "are"} coming soon — we'll let you know.` : ""}
        </p>
        <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {state === "CERTIFIED" ? (
            <Link href={`/learn/${slug}`} className={BTN_K}>View Certificate</Link>
          ) : p.test.ready ? (
            <Link href={`/learn/${slug}/test`} data-take-test className={BTN_K}>Take the Test</Link>
          ) : (
            <NotifyMe pathId={p.id} initial={p.watchingTest} signedIn test label="Test Opens Soon · Notify Me" className={BTN + " bg-surface text-ink"} />
          )}
          <Link href={top ? `/learn/${top.path.slug}` : PICK_NEXT_HREF} className={BTN}>{top ? `Continue With ${top.path.title}` : "Pick Your Next Path"}</Link>
        </div>
        {top && <p data-top-pick className="mt-3 text-[13px] text-ink-2">{top.reason} · <Link href={`/learn/${slug}#whats-next`} className="font-bold text-magenta-dark underline underline-offset-4">See What&apos;s Next</Link></p>}
      </main>
    </>
  );
}
