import { prisma } from "@/lib/prisma";
import {
  extractDocText,
  validateTopicPage,
} from "@/lib/learn-doc-source";

/**
 * FETCH ONE COURSE'S VENDOR DOCUMENTATION (brief_learn_assessments_generate WS1).
 *
 *   npm run learn:fetch-docs -- --course=<slug> --url=<topic url> [--apply]
 *
 * ── ⚠ COUNSEL GATE: THIS IS WHY IT TAKES ONE COURSE AT A TIME ────────────────
 *
 * Storing Oracle's documentation text in Panameer's database and generating
 * derived, GRADED assessment content from it is a LICENSING question and it is
 * not answered. There is deliberately NO `--all`: the path is built and proven
 * on one course, and bulk population waits for that question to be cleared.
 *
 * ── ⚠ IT REFUSES TO STORE A LANDING PAGE ────────────────────────────────────
 *
 * Version-pinned Oracle URLs rot by REDIRECTING, not by 404ing. Measured
 * 2026-08-19: `.../25a/oaprc/qualification-areas.html` answers 200 after a
 * redirect to `.../26c/index.html`, "Oracle Procurement 26C - Get Started" —
 * a real page, full of text, and completely wrong. `validateTopicPage` compares
 * the FINAL pathname to the requested one, which is the only check that notices.
 */
function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const slug = arg("course");
  const url = arg("url");
  if (!slug || !url) {
    console.error(
      "Usage: npm run learn:fetch-docs -- --course=<course-slug> --url=<oracle topic url> [--apply]"
    );
    process.exit(2);
  }

  const course = await prisma.course.findFirst({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      doc_source_url: true,
      doc_fetched_at: true,
      learningPath: { select: { title: true, slug: true } },
    },
  });
  if (!course) {
    console.error(`No course with slug "${slug}".`);
    process.exit(1);
  }
  console.log(`course : "${course.title}"  (path: ${course.learningPath.title})`);
  console.log(`already: ${course.doc_source_url ?? "nothing stored"}`);
  console.log(`fetch  : ${url}`);

  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      /*
        Identified honestly. A server doing us a favour should be able to see who
        is asking, and one course at a time is the whole request budget.
      */
      "User-Agent": "PanameerLearnDocFetch/1.0 (+https://panameer.com)",
      Accept: "text/html",
    },
  });
  console.log(`status : ${res.status}   final: ${res.url}`);
  if (!res.ok) {
    console.error(`⚠ REFUSED: HTTP ${res.status}.`);
    process.exit(1);
  }

  const html = await res.text();
  const { title, text } = extractDocText(html);
  console.log(`title  : ${JSON.stringify(title)}`);
  console.log(`text   : ${text.length} characters`);

  const verdict = validateTopicPage({ requestedUrl: url, finalUrl: res.url, title, text });
  if (!verdict.ok) {
    /* ⚠ LOUD. Storing this quietly is the failure this script exists to prevent. */
    console.error(`\n⚠ REFUSED — NOT A TOPIC PAGE: ${verdict.reason}`);
    console.error(`Nothing was written. Find the current version of the topic and re-run.`);
    process.exit(1);
  }
  console.log(`verdict: OK — this is the topic, not a landing page`);
  console.log(`\nfirst 300 chars:\n  ${text.slice(0, 300)}…`);

  if (!apply) {
    console.log(`\nDRY RUN. Pass --apply to store it.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { doc_source_url: url, doc_source_text: text, doc_fetched_at: new Date() },
  });
  console.log(`\nstored on course "${course.title}" — ${text.length} characters.`);
  console.log(`⚠ COUNSEL GATE: one course, as a demonstration. Do not bulk-populate.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
