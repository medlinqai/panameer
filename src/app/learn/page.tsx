import Link from "next/link";
import { canAdminister } from "@/lib/access";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { learnersThisMonth, rankLearners, topTeachers } from "@/lib/learn-homepage";
import { LearnBoards } from "@/components/learn/LearnBoards";
import { recommendNext } from "@/lib/learn-next";
import { learnCatalog } from "@/lib/learn-catalog";
import { viewerTeaches } from "@/lib/learn-home";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { LeadersPodium } from "@/components/community/LeadersPodium";

export const metadata = {
  title: "Learn — Panameer",
  description: "Who's learning most on Panameer this month, the top learners and teachers, and what to learn next.",
};
export const dynamic = "force-dynamic";

const BEGINNER_PATH = "oracle-cloud-foundations";
const paths = (n: number) => `${n} path${n === 1 ? "" : "s"}`;

// LT-E001: Learn › Home is the leaderboard (Connect › Leaders pattern). Your own record lives on My Learning and Certificates.
export default async function LearnHomePage({ searchParams }: { searchParams: Promise<{ lb?: string; tb?: string; show?: string }> }) {
  const viewer = await memberOrPublicTwin("/learn");
  const { lb: lbRaw, tb: tbRaw, show } = await searchParams;
  const lb = lbRaw === "all" ? "all" : "month";
  const tb = tbRaw === "all" ? "all" : "month";
  const [month, board, teachers, active, teaches, catalog] = await Promise.all([
    rankLearners("month"),
    lb === "month" ? null : rankLearners("all"),
    topTeachers(tb, show === "teachers" ? 50 : 3),
    learnersThisMonth(),
    viewerTeaches(viewer),
    learnCatalog(viewer.userId),
  ]);
  const learners = (board ?? month).slice(0, show === "learners" ? 50 : 3);
  const myIdx = month.findIndex((r) => r.userId === viewer.userId);
  const me = myIdx >= 0 ? month[myIdx] : null;
  const finishedThisMonth = month.reduce((n, r) => n + r.n, 0);
  const firstVisit = !catalog.some((p) => p.mine && (p.mine.enrolled || p.mine.done > 0)) && !catalog.some((p) => p.certificate);
  const rec = firstVisit ? null : await recommendNext(viewer.userId, { paths: catalog });
  const next = firstVisit ? catalog.find((p) => p.slug === BEGINNER_PATH) ?? null : rec?.picks[0]?.path ?? null;
  const reason = firstVisit ? "the basics before any module path" : rec?.picks[0]?.reason ?? null;
  const vs = me ? (myIdx === 0 ? month[1] : month[myIdx - 1]) : null;
  const gap = me && vs ? Math.abs(me.n - vs.n) : 0;
  const keep = (k: string, v: string | null) => (v ? `${k}=${v}&` : "");
  const qs = `${keep("lb", lb === "all" ? "all" : null)}${keep("tb", tb === "all" ? "all" : null)}`;

  return (
    <>
      <LearnTabs active="home" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learn-home>
        <AccountHero
          testId="learn-hero"
          picture={
            <LeadersPodium
              top={month.slice(0, 3).map((r) => ({ personId: r.personId, name: r.name, photoUrl: r.photoUrl, points: r.n }))}
              viewerId={me?.personId ?? ""}
              scorers={month.length}
              viewerRank={me ? myIdx + 1 : null}
              unit={paths}
              caption={`This month · paths finished${me && myIdx >= 3 ? ` · You're #${myIdx + 1}` : ""}`}
            />
          }
          eyebrow="Learn"
          title="Who's Learning Most"
          kpis={[
            { value: me ? `#${myIdx + 1}` : "—", label: "YOUR RANK" },
            { value: finishedThisMonth, label: "PATHS FINISHED THIS MONTH" },
            { value: active, label: "LEARNERS THIS MONTH" },
          ]}
          paragraph={
            <p data-learn-nudge>
              {me
                ? vs
                  ? <>You&apos;re <b className="text-ink">#{myIdx + 1}</b> this month, {gap === 0 ? <>level with {vs.name}</> : <>{paths(gap)} {myIdx === 0 ? "ahead of" : "behind"} {vs.name}</>}. </>
                  : <>You&apos;re <b className="text-ink">#1</b> this month. </>
                : <>Finish a path this month to join the board. </>}
              {next && <>Up next for you: <b className="text-ink">{next.title}</b>{reason ? ` — ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : ""}.</>}
            </p>
          }
          actions={
            <>
              {next && (
                <Link href={next.mine?.next ? `/learn/${next.slug}/${next.mine.next.id}` : `/learn/${next.slug}`} data-start-next className={HERO_BTN}>
                  {`${next.mine && next.mine.done > 0 ? "Continue" : "Start"} ${next.title}`}
                </Link>
              )}
              <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
            </>
          }
        />
        <LearnBoards
          learners={learners}
          teachers={teachers}
          lb={lb}
          tb={tb}
          meUserId={viewer.userId}
          createHref={canAdminister(viewer) ? "/admin/setup/learn-authoring" : null}
          teaches={teaches}
          seeAll={{ learners: show === "learners" ? null : `/learn?${qs}show=learners#top-learners`, teachers: show === "teachers" ? null : `/learn?${qs}show=teachers#top-teachers` }}
        />
      </div>
    </>
  );
}
