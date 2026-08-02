import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { linkVolume } from "@/lib/admin-reports";

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

      <VolumeFooter
        tiles={linkVolume([
          { label: "Learning Paths", value: paths },
          { label: "Courses", value: courses },
          { label: "Lessons", value: lessons },
          { label: "Tests" },
          { label: "Certifications" },
        ])}
      />
    </div>
  );
}
