import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { finishes, rankLearners, topTeachers } from "@/lib/learn-homepage";
import { recommendNext } from "@/lib/learn-next";
import { learnCatalog } from "@/lib/learn-catalog";
import { viewerTeaches } from "@/lib/learn-home";
import { HubHome, RankList, VsGroup, type RankRow } from "@/components/home/HubHome";
import { displayFirstName } from "@/lib/display";
import { C, type Donut } from "@/lib/dashboard/types";
import { appCounts } from "@/lib/attention";
import { todoGroups } from "@/lib/todo";

export const metadata = {
  title: "Learn — Panameer",
  description: "Your learning at a glance, what to do next, and who's learning most on Panameer.",
};
export const dynamic = "force-dynamic";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const SW_ON = "rounded-full bg-ink px-3 py-1 text-surface";
const SW_OFF = "rounded-full px-3 py-1 text-ink-2 hover:text-ink";

// HT-E008 / WK-E005: Learn › Home (no tab row) follows the dashboard — At a Glance (My Learning · My Teaching) beside Things You Need to Do, then Who's Learning Most.
export default async function LearnHomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await memberOrPublicTwin("/learn");
  const { view: rawView } = await searchParams;
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, providerProfile: { select: { id: true } } } });
  const [catalog, month, teachers, teaches] = await Promise.all([learnCatalog(viewer.userId), rankLearners("month"), topTeachers("month", 50), viewerTeaches(viewer)]);
  const view = teaches && rawView === "teaching" ? "teaching" : "learning";
  const rec = await recommendNext(viewer.userId, { paths: catalog, limit: 50 });
  const matched = rec.picks.filter((p) => !p.path.mine?.enrolled);
  const enrolled = catalog.filter((p) => p.mine?.enrolled);
  const finished = enrolled.filter((p) => p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total);
  const inProgress = enrolled.filter((p) => p.mine && p.mine.done > 0 && p.mine.done < p.mine.total);
  const earned = catalog.filter((p) => p.certificate);
  const onProfile = me?.providerProfile ? await prisma.credential.count({ where: { provider_profile_id: me.providerProfile.id, learning_path_id: { not: null } } }) : 0;
  const readyToTest = catalog.filter((p) => p.tag === "READY_TO_TEST");
  const passed = catalog.filter((p) => p.test.passed);
  const available = catalog.filter((p) => p.test.ready && !p.test.passed && p.test.used === 0);
  const retake = catalog.filter((p) => p.test.ready && !p.test.passed && p.test.used > 0 && p.test.used < p.test.maxAttempts);
  // Matched Skills: the profile's skills that a published path teaches (Covered) or that no path teaches yet (Gaps).
  const mySkills = me?.providerProfile ? (await prisma.providerSkill.findMany({ where: { provider_profile_id: me.providerProfile.id }, select: { skill_id: true } })).map((s) => s.skill_id) : [];
  const taught = new Set((await prisma.learningPathSkill.findMany({ where: { skill_id: { in: mySkills }, learningPath: { status: "PUBLISHED" } }, select: { skill_id: true } })).map((s) => s.skill_id));
  const covered = mySkills.filter((s) => taught.has(s)).length;

  const learning: Donut[] = [
    { key: "my-learning", title: "My Learning", sub: "Paths you take", href: "/learn/my", lead: { text: `${catalog.length} learning paths on Panameer`, href: "/learn/paths", label: "Browse" }, slices: [
      { label: "Matched to You", n: matched.length, color: C.grey, mine: true, href: "/learn/paths" }, { label: "Enrolled", n: enrolled.length - inProgress.length - finished.length, color: C.steel, href: "/learn/my" },
      { label: "In Progress", n: inProgress.length, color: C.pend, href: "/learn/my" }, { label: "Finished", n: finished.length, color: C.ok, href: "/learn/my" }] },
    { key: "certificates", title: "Certificates", sub: "What buyers see", href: "/learn/certificates", slices: [
      { label: "Earned", n: earned.length, color: C.ok, href: "/learn/certificates" }, { label: "On Your Profile", n: onProfile, color: C.ink, href: "/profile" },
      { label: "Ready to Test", n: readyToTest.length, color: C.pend, mine: true, href: "/learn/my" }] },
    { key: "tests", title: "Tests", sub: "Prove a skill", href: "/learn/certificates", slices: [
      { label: "Passed", n: passed.length, color: C.ok, href: "/learn/certificates" }, { label: "Available", n: available.length, color: C.steel, href: "/learn/paths" },
      { label: "Retake", n: retake.length, color: C.pend, mine: true, href: "/learn/my" }] },
    { key: "skills", title: "Matched Skills", sub: "From your profile", href: "/profile/edit/skills", slices: mySkills.length
      ? [{ label: "Covered", n: covered, color: C.ok, href: "/learn/paths" }, { label: "Gaps", n: mySkills.length - covered, color: C.pend, href: "/learn/paths" }]
      : [{ label: "Covered", n: 0, color: C.ok, untracked: true }, { label: "Gaps", n: 0, color: C.pend, untracked: true }] },
  ];
  // My Teaching (only for people who teach a path).
  const myPaths = teaches && me ? await prisma.learningPath.findMany({ where: { instructor_person_id: me.id, status: "PUBLISHED" }, select: { id: true } }) : [];
  const myPathIds = new Set(myPaths.map((p) => p.id));
  const [myLearners, fin] = myPaths.length ? await Promise.all([prisma.enrollment.count({ where: { learning_path_id: { in: [...myPathIds] } } }), finishes()]) : [0, null];
  const myFinished = fin ? fin.finished.filter((f) => myPathIds.has(f.pathId)).length : 0;
  const teaching: Donut[] = [{ key: "teaching", title: "My Teaching", sub: "Paths you teach", href: "/learn/teaching", slices: [
    { label: "Paths I Teach", n: myPaths.length, color: C.ink, href: "/learn/teaching" }, { label: "Learners", n: myLearners, color: C.steel, href: "/learn/teaching" },
    { label: "Finished", n: myFinished, color: C.ok, href: "/learn/teaching" }, { label: "Rating", n: 0, color: C.grey, untracked: true }] }];

  // WK-E008: Things You Need to Do = the Worklist's Learn items (appCounts keeps it current).
  const side = me?.providerProfile ? "provider" : "buyer";
  if (me) await appCounts(viewer, side);
  const todo = me ? await todoGroups(me.id, side, ["learn"]) : [];
  // 2 · Who's Learning Most: top 3 + your row; you vs the group.
  const myIdx = month.findIndex((r) => r.userId === viewer.userId);
  const tIdx = me ? teachers.findIndex((r) => r.personId === me.id) : -1;
  const rr = (r: (typeof month)[number], i: number, mine: boolean): RankRow => ({ rank: i + 1, name: r.name, photoUrl: r.photoUrl, line: r.sub ?? "", value: r.n, me: mine });
  const myTaken = new Set((await prisma.certificationAttempt.findMany({ where: { user_id: viewer.userId, is_preview: false }, select: { learning_path_id: true } })).map((a) => a.learning_path_id)).size;
  const grp = await learnGroup();
  const first = displayFirstName(me?.first_name);
  const switcher = teaches ? (
    <span className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-semibold" role="group" aria-label="At a Glance view" data-view-switch>
      <Link href="/learn" aria-current={view === "learning" ? "page" : undefined} className={view === "learning" ? SW_ON : SW_OFF}>My Learning</Link>
      <Link href="/learn?view=teaching" aria-current={view === "teaching" ? "page" : undefined} className={view === "teaching" ? SW_ON : SW_OFF}>My Teaching</Link>
    </span>
  ) : null;
  const next = inProgress[0] ?? matched[0]?.path ?? null;
  return (
    <>
      <div className="px-4 py-6 sm:px-6">
        <HubHome
          eyebrow="LEARN" title={`Keep Learning${first ? `, ${first}` : ""}`}
          summary={`${plural(matched.length, "path")} matched to you · ${plural(earned.length, "certificate")} · ${myIdx >= 0 ? `rank #${myIdx + 1} this month` : "not ranked yet this month"}`}
          primary={next ? { label: inProgress.length ? "Continue Learning" : "Start Learning", href: next.mine?.next ? `/learn/${next.slug}/${next.mine.next.id}` : `/learn/${next.slug}` } : { label: "Browse Learning Paths", href: "/learn/paths" }}
          secondary={next ? { label: "Browse Learning Paths", href: "/learn/paths" } : { label: "My Learning", href: "/learn/my" }}
          donuts={view === "teaching" ? teaching : learning} viewSwitch={switcher} todo={todo}
          section2Title="Who's Learning Most" section2Right="This Month"
          actions={[
            { label: "Browse Paths", href: "/learn/paths", icon: "book" },
            { label: "Keep Learning", href: inProgress[0]?.mine?.next ? `/learn/${inProgress[0].slug}/${inProgress[0].mine.next.id}` : "/learn/my", icon: "play" },
            { label: "Take a Test", href: readyToTest[0] ? `/learn/${readyToTest[0].slug}/test` : "/learn/certificates", icon: "award" },
            { label: "Teach", href: teaches ? "/learn/teaching" : "/support", icon: "teach" },
          ]}
          section2={<>
            <RankList eyebrow="PATHS FINISHED" title="Top Learners" rows={month.slice(0, 3).map((r, i) => rr(r, i, r.userId === viewer.userId))}
              me={myIdx >= 0 ? rr(month[myIdx], myIdx, true) : { rank: null, name: "You", photoUrl: null, line: "0 paths this month", value: 0, me: true }} />
            <RankList eyebrow="LEARNERS" title="Top Teachers" rows={teachers.slice(0, 3).map((r, i) => rr(r, i, r.personId === me?.id))}
              me={tIdx >= 0 ? rr(teachers[tIdx], tIdx, true) : { rank: null, name: "You", photoUrl: null, line: "Not teaching yet", value: 0, me: true }} />
            <VsGroup title="Courses" rows={[["Enrolled", enrolled.length, grp.enrolled], ["Taken", myTaken, grp.taken], ["Certified", earned.length, grp.certified]]} />
          </>}
        />
      </div>
    </>
  );
}

/** Group = the average per person who has at least one. */
async function learnGroup() {
  const [enr, att, pas] = await Promise.all([
    prisma.enrollment.groupBy({ by: ["user_id"], _count: { _all: true } }),
    prisma.certificationAttempt.findMany({ where: { is_preview: false }, distinct: ["user_id", "learning_path_id"], select: { user_id: true } }),
    prisma.certificationAttempt.findMany({ where: { is_preview: false, passed: true }, distinct: ["user_id", "learning_path_id"], select: { user_id: true } }),
  ]);
  const avg = (t: number, n: number) => (n ? Math.round(t / n) : 0);
  const takers = new Set(att.map((a) => a.user_id));
  const passers = new Set(pas.map((a) => a.user_id));
  return { enrolled: avg(enr.reduce((n, e) => n + e._count._all, 0), enr.length), taken: avg(att.length, takers.size), certified: avg(pas.length, passers.size) };
}
