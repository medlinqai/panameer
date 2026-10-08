// Read-only: show what a lesson stores for its video. Usage: npx tsx --env-file=.env.local scripts/lesson-video-check.ts <lessonId>
import { prisma } from "@/lib/prisma";
import { isPlayable, vimeoEmbedUrl } from "@/lib/learn";
(async () => {
  const l = await prisma.lesson.findUnique({ where: { id: process.argv[2] }, select: { title: true, vimeo_ref: true, production_status: true } });
  console.log(l ? { ...l, playable: isPlayable(l), embed: vimeoEmbedUrl(l.vimeo_ref) } : "not found");
  await prisma.$disconnect();
})();
