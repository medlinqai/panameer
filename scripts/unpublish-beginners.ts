// Beginners merged into Oracle Cloud Foundations (Scott 2026-10-08): take the one-lesson stub off the catalog.
// Usage: npx tsx --env-file=.env.local scripts/unpublish-beginners.ts
import { prisma } from "@/lib/prisma";

(async () => {
  const p = await prisma.learningPath.findUnique({ where: { slug: "end-user-beginners" }, select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } } });
  if (!p) throw new Error("end-user-beginners not found");
  if (p._count.enrollments > 0) throw new Error(`Not unpublished: ${p._count.enrollments} enrollment(s) — tell Claude`);
  await prisma.learningPath.update({ where: { id: p.id }, data: { status: "DRAFT" } });
  console.log(`✓ "${p.title}" ${p.status} → DRAFT (address forwards to Oracle Cloud Foundations)`);
  await prisma.$disconnect();
})();
