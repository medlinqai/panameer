// Attach an already-uploaded Vimeo video to an Oracle Cloud Foundations lesson (2026-10-08).
// Usage: npx tsx --env-file=.env.local scripts/attach-vimeo.ts "<lesson title>" <vimeo id or URL>
import { prisma } from "@/lib/prisma";
import { notifyOpenedPaths } from "@/lib/learn-watch";

const [title, raw] = process.argv.slice(2);
if (!title || !raw) throw new Error('Usage: attach-vimeo.ts "<lesson title>" <vimeo id or URL>');
const id = raw.match(/(\d{6,})/)?.[1];
if (!id) throw new Error(`No Vimeo id in "${raw}"`);

(async () => {
  const lesson = await prisma.lesson.findFirst({
    where: { title, section: { course: { learningPath: { slug: "oracle-cloud-foundations" } } } },
    select: { id: true, title: true, vimeo_ref: true },
  });
  if (!lesson) throw new Error(`Lesson "${title}" not found in Oracle Cloud Foundations`);
  let duration = 0;
  try {
    const r = await fetch(`https://api.vimeo.com/videos/${id}?fields=duration`, { headers: { Authorization: `bearer ${process.env.VIMEO_ACCESS_TOKEN ?? ""}` } });
    if (r.ok) duration = (await r.json()).duration ?? 0;
  } catch {}
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { vimeo_ref: id, production_status: "URL_ADDED_TO_LESSON", ...(duration ? { duration_seconds: duration, duration_source: "vimeo" } : {}) },
  });
  console.log(`✓ "${lesson.title}" → vimeo ${id}${duration ? ` (${duration}s)` : " (length not read)"}${lesson.vimeo_ref ? ` — replaced ${lesson.vimeo_ref}` : ""}`);
  await notifyOpenedPaths();
  await prisma.$disconnect();
})();
