import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { buildCompletenessInput } from "@/lib/onboarding";
import { missingRequired } from "@/lib/completeness";
import { notify } from "@/lib/notifications";

// Score re-weight (2026-10-06): one bell + one email to each REAL member who dropped below 80. --send to send.
const send = process.argv.includes("--send");
const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a.at(-1)}` : a[0] ?? "");
(async () => {
  const rows = readFileSync("docs/catalog/score_reweight_2026-10-06.csv", "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  const targets = rows.filter((r) => r[3] === "false" && r[6] === "true" && r[7] === "false" && !/@panameer\.com$/i.test(r[2]));
  for (const [profileId, name, email] of targets) {
    const input = await buildCompletenessInput(profileId);
    const pp = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { person_id: true, completeness: true } });
    if (!input || !pp) {
      console.log(`SKIP ${name} — profile not found`);
      continue;
    }
    if (pp.completeness >= 80) {
      console.log(`SKIP ${name} — already back at ${pp.completeness}`);
      continue;
    }
    const missing = missingRequired(input);
    console.log(`${send ? "SEND" : "would send"} ${name} <${email}> (${pp.completeness}) — ${list(missing) || "(nothing missing?)"}`);
    if (!send || !missing.length) continue;
    await notify({ event: "profile.score_reweight", personId: pp.person_id, entityType: "provider_profile", entityId: profileId, dedupeKey: "profile.score_reweight:2026-10-06", vars: { missing: list(missing) } });
    const n = await prisma.notification.findFirst({ where: { person_id: pp.person_id, dedupe_key: "profile.score_reweight:2026-10-06" }, select: { email_sent_at: true, suppressed_reason: true } });
    console.log(`   → bell ✓ · email ${n?.email_sent_at ? "sent" : `NOT sent (${n?.suppressed_reason ?? "unknown"})`}`);
  }
  process.exit(0);
})();
