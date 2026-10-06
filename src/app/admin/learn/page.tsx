import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { linkVolume } from "@/lib/admin-reports";
import { readQuestions } from "@/lib/learn-assessment";
import { PLAYABLE_STATUSES } from "@/lib/learn";
import { productionQueue } from "@/lib/path-interest";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [paths, published, courses, lessons, urlMissing] = await Promise.all([
    prisma.learningPath.count(),
    prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.lesson.count({
      where: {
        production_status: { in: [...PLAYABLE_STATUSES] },
        OR: [{ vimeo_ref: null }, { vimeo_ref: "" }],
      },
    }),
  ]);

  const prodQueue = await productionQueue();

  const rows = await prisma.learningPath.findMany({
    orderBy: { created_at: "desc" },
    take: 12,
    select: {
      id: true, title: true, slug: true, status: true, created_at: true,
      expert: { select: { first_name: true, last_name: true } },
      courses: { select: { sections: { select: { lessons: { select: { id: true } } } } } },
    },
  });

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

      {/* THE QUEUE, AND THE `Described` COLUMN IS THE POINT OF IT. A path with a */}
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

      {/* THE PRODUCTION QUEUE WS-C) */}
      <Listing
        title="Production Queue"
        columns={["Path", "Recorded", "Planned", "Status unclear", "Wanted by"]}
        rows={prodQueue.map((q) => [
          <Link key={q.id} href={`/admin/setup/learn-authoring/${q.id}`} className="font-semibold text-magenta">
            {q.title}
          </Link>,
          q.recorded > 0 ? `${q.recorded}` : "—",
          q.planned > 0 ? `${q.planned}` : "—",
          q.unpublished > 0 ? `${q.unpublished}` : "—",
          // A MEASURED ZERO PRINTS `0`. Nobody has asked yet, and that is a
          `${q.votes}`,
        ])}
        empty={<StubEmpty what="outstanding lessons" why="Every published path is fully produced." />}
      />

      <VolumeFooter
        tiles={linkVolume([
          { label: "Learning Paths", value: paths },
          { label: "Courses", value: courses },
          { label: "Lessons", value: lessons },
          /* REAL NUMBERS NOW — the review screen made them meaningful. */
          { label: "Tests", value: publishedTests },
          { label: "Tests in draft", value: draftTests },
          { label: "Certifications" },
        ])}
      />
    </div>
  );
}
