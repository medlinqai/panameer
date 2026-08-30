import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { linkVolume } from "@/lib/admin-reports";
import { readQuestions } from "@/lib/learn-assessment";

export const dynamic = "force-dynamic";

/**
 * Admin → LEARN, the dense console page (WS2, deck slide 2).
 *
 * This route used to BE the authoring tool. The role-density model says
 * /admin/learn is the dense read of the same data the rich /learn shows, and
 * authoring is a different job — so the CRUD moved to
 * /admin/setup/learn-authoring rather than being deleted, and this page is the
 * overview the deck draws.
 *
 * The four tiles are the deck's review queues. Two are REAL — drafts and the
 * URL gap are readable from the catalog — and two need a review-queue model
 * that doesn't exist, so they say so rather than showing a number.
 */
export default async function Page() {
  const [paths, published, courses, lessons, urlMissing] = await Promise.all([
    prisma.learningPath.count(),
    prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.lesson.count({
      where: {
        production_status: { in: ["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"] },
        OR: [{ vimeo_ref: null }, { vimeo_ref: "" }],
      },
    }),
  ]);

  const rows = await prisma.learningPath.findMany({
    orderBy: { created_at: "desc" },
    take: 12,
    select: {
      id: true, title: true, slug: true, status: true, created_at: true,
      expert: { select: { first_name: true, last_name: true } },
      courses: { select: { sections: { select: { lessons: { select: { id: true } } } } } },
    },
  });

  /*
    ── ⚠ THE CERTIFICATION REVIEW QUEUE (P1-J3-E020) ───────────────────────────

    Every path, its test state, and the ONE NUMBER that decides whether its test is
    worth reading: how many of its lessons carry a description. `P1-J3-E006` — with
    no description the model writes from the lesson TITLE and produces plausible,
    confidently-wrong questions — so a queue that showed only "DRAFT / 20q" would be
    a queue that invites publishing the bad ones first.

    ⚠ ALL OF THEM, NOT `take: 12` LIKE THE LISTING ABOVE. This is the queue Scott
    works through; a page that silently showed 12 of 23 would look finished when it
    was not.
  */
  const queue = await prisma.learningPath.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true, title: true,
      assessment: { select: { status: true, questions: true, reviewed_at: true } },
      courses: {
        select: { sections: { select: { lessons: { select: { id: true, description: true } } } } },
      },
    },
  });
  const queueRows = queue
    .map((p) => {
      const ls = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
      const described = ls.filter((l) => l.description && l.description.trim().length > 0).length;
      /*
        ⚠ `readQuestions`, NOT `questions.length`. They disagree, and the
        disagreement is information: `1. Background` holds SIX raw entries and
        ZERO that survive `ASSESSMENT_SCHEMA`, so a raw count showed a served
        path where the review screen shows an empty set. The queue has to show
        what a reviewer will actually see, or the one broken row hides.
      */
      const qs = p.assessment ? readQuestions(p.assessment).length : 0;
      return { id: p.id, title: p.title, lessons: ls.length, described, qs,
        status: p.assessment?.status ?? null, reviewed: Boolean(p.assessment?.reviewed_at) };
    })
    /* Drafts first — they are the ones needing a human — then by size. */
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.status === "DRAFT" ? 0 : x.status === "PUBLISHED" ? 2 : 1);
      return rank(a) - rank(b) || b.lessons - a.lessons;
    });
  const publishedTests = queueRows.filter((r) => r.status === "PUBLISHED").length;
  const draftTests = queueRows.filter((r) => r.status === "DRAFT").length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Learning Paths to Review", value: paths - published, hint: "Still in draft" },
          { label: "Courses to Review", value: courses, hint: "In the catalog" },
          { label: "Lessons to Review", value: urlMissing, hint: "Marked done, no video" },
          { label: "New Instructors Awaiting Approval", hint: "Needs an approval queue" },
        ]}
      />

      <Listing
        title="Learning Paths"
        columns={["Time", "Requester - Company", "Role", "Status", "Start Date", "Message"]}
        action={
          <Link
            href="/admin/setup/learn-authoring"
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            Authoring →
          </Link>
        }
        rows={rows.map((r) => [
          r.created_at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          <Link key={r.id} href={`/admin/setup/learn-authoring/${r.id}`} className="font-semibold text-magenta hover:underline">
            {r.title}
          </Link>,
          r.expert ? `${r.expert.first_name ?? ""} ${r.expert.last_name ?? ""}`.trim() : "—",
          <span
            key="s"
            className={
              "rounded-full px-2.5 py-0.5 text-[12px] font-bold " +
              (r.status === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-700" : "bg-black/[0.05] text-ink-2")
            }
          >
            {r.status}
          </span>,
          r.created_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          `${r.courses.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.lessons.length, 0), 0)} lessons`,
        ])}
        empty={<StubEmpty what="learning paths" why="The catalog is empty." />}
      />

      {/*
        ⚠ THE QUEUE, AND THE `Described` COLUMN IS THE POINT OF IT. A path with a
        DRAFT set and 0% described lessons is the `P1-J3-E006` trap: twenty
        well-formed questions written from titles that a reviewer will skim and pass.
      */}
      <Listing
        title="Certification Tests"
        columns={["Learning Path", "Lessons", "Described", "Test", "Questions", ""]}
        rows={queueRows.map((r) => [
          <Link
            key={r.id}
            href={`/admin/learn/paths/${r.id}/assessment`}
            className="font-semibold text-magenta hover:underline"
          >
            {r.title}
          </Link>,
          String(r.lessons),
          /* Colour is the warning, the fraction is the evidence. */
          <span
            key="d"
            className={
              "font-semibold " +
              (r.lessons > 0 && r.described / r.lessons >= 0.5
                ? "text-emerald-700"
                : r.described === 0
                  ? "text-magenta"
                  : "text-ink-2")
            }
          >
            {r.described}/{r.lessons}
          </span>,
          <span
            key="s"
            className={
              "rounded-full px-2.5 py-0.5 text-[12px] font-bold " +
              (r.status === "PUBLISHED"
                ? "bg-emerald-500/10 text-emerald-700"
                : r.status === "DRAFT"
                  ? "bg-amber-500/10 text-amber-700"
                  : "bg-black/[0.05] text-ink-2")
            }
          >
            {r.status ?? "none"}
          </span>,
          r.qs > 0 ? String(r.qs) : "—",
          <Link
            key="r"
            href={`/admin/learn/paths/${r.id}/assessment`}
            className="text-[13px] font-bold text-magenta hover:underline"
          >
            {r.status === "DRAFT" ? "Review →" : r.status ? "Open →" : ""}
          </Link>,
        ])}
        empty={<StubEmpty what="learning paths" why="The catalog is empty." />}
      />

      <VolumeFooter
        tiles={linkVolume([
          { label: "Learning Paths", value: paths },
          { label: "Courses", value: courses },
          { label: "Lessons", value: lessons },
          /* ⚠ REAL NUMBERS NOW — the review screen made them meaningful. */
          { label: "Tests", value: publishedTests },
          { label: "Tests in draft", value: draftTests },
          { label: "Certifications" },
        ])}
      />
    </div>
  );
}
