import { prisma } from "@/lib/prisma";
// One-off: notifications saved before CA-E003 keep their old titles. Rewrite them to the availability wording.
(async () => {
  const rows = await prisma.notification.findMany({ where: { OR: [{ title: { contains: "Request to Propose" } }, { title: { contains: "Request to propose" } }, { title: { startsWith: "Proposal from " } }, { title: { startsWith: "A proposal on " } }] }, select: { id: true, title: true } });
  let n = 0;
  for (const r of rows) {
    let t = r.title.replace(/Request to [Pp]ropose on /, "Availability Request on ");
    const m = t.match(/^Proposal from (.+?)(?: at (.+?))? on (.+)$/);
    if (m) t = `${m[1]} is available${m[2] ? ` at ${m[2]}` : ""} for ${m[3]}`;
    t = t.replace(/^A proposal on (.+)$/, "A provider is available for $1");
    if (t !== r.title) { await prisma.notification.update({ where: { id: r.id }, data: { title: t } }); n++; }
  }
  console.log(`renamed ${n} of ${rows.length}`);
  process.exit(0);
})();
