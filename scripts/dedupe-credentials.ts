// HP-E008: one credential per name per person (case-insensitive, same kind). Keeps the richest row (Panameer-issued,
// then with a link / file / ID, then on the profile, then the oldest) and repoints job_credentials. Dry run writes a CSV; --apply deletes.
import { writeFileSync, mkdirSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

(async () => {
  const apply = process.argv.includes("--apply");
  const rows = await prisma.credential.findMany({ select: { id: true, user_id: true, provider_profile_id: true, kind: true, name: true, issued_from: true, url: true, public_credential_url: true, attachment_path: true, credential_id: true, issuer: true, created_at: true } });
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.user_id}|${r.kind}|${r.name.trim().toLowerCase().replace(/\s+/g, " ")}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const score = (r: (typeof rows)[number]) => (r.issued_from === "PANAMEER" ? 100 : 0) + (r.public_credential_url || r.url ? 20 : 0) + (r.attachment_path ? 20 : 0) + (r.credential_id ? 10 : 0) + (r.issuer ? 5 : 0) + (r.provider_profile_id ? 5 : 0);
  const out = ["user_id,name,kept_id,deleted_id"];
  const plan: { keep: string; drop: string[] }[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => score(b) - score(a) || a.created_at.getTime() - b.created_at.getTime());
    const [keep, ...drop] = sorted;
    plan.push({ keep: keep.id, drop: drop.map((d) => d.id) });
    for (const d of drop) out.push(`${keep.user_id},"${keep.name.replace(/"/g, "'")}",${keep.id},${d.id}`);
  }
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/dedupe_credentials_dryrun.csv", out.join("\n") + "\n");
  console.log(JSON.stringify({ credentials: rows.length, duplicateGroups: plan.length, toDelete: plan.reduce((n, p) => n + p.drop.length, 0) }));
  if (apply) {
    for (const p of plan) {
      await prisma.$transaction([
        prisma.jobCredential.updateMany({ where: { credential_id: { in: p.drop } }, data: { credential_id: p.keep } }),
        prisma.credential.deleteMany({ where: { id: { in: p.drop } } }),
      ]);
    }
    console.log("APPLIED");
  } else console.log("DRY RUN — scripts/out/dedupe_credentials_dryrun.csv");
  await prisma.$disconnect();
  process.exit(0);
})();
