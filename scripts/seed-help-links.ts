// SH2-E008: three sample Help links (one video, one PDF, one web page), marked sample — replace them in Admin › Help Links.
// Usage: npx tsx --env-file=.env.local scripts/seed-help-links.ts [--apply]
import { prisma } from "@/lib/prisma";

const SAMPLES = [
  { title: "Sample: a short YouTube video", description: "Shows how a video plays inside Panameer.", type: "VIDEO" as const, url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", sort: 10 },
  { title: "Sample: Form W-9 (PDF)", description: "Shows how a PDF opens inline.", type: "PDF" as const, url: "https://www.irs.gov/pub/irs-pdf/fw9.pdf", sort: 20 },
  { title: "Sample: Small business (Wikipedia)", description: "Shows how a web page opens inside Panameer.", type: "WEB_PAGE" as const, url: "https://en.wikipedia.org/wiki/Small_business", sort: 30 },
];

(async () => {
  const apply = process.argv.includes("--apply");
  for (const s of SAMPLES) {
    const have = await prisma.helpLink.findFirst({ where: { url: s.url }, select: { id: true } });
    console.log(`${have ? "= exists" : apply ? "+ added" : "+ would add"}  ${s.title}`);
    if (!have && apply) await prisma.helpLink.create({ data: { ...s, sample: true } });
  }
  console.log(apply ? "Applied." : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
