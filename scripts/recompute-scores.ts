import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { buildCompletenessInput, recomputeCompleteness } from "@/lib/onboarding";
import { computeProviderCompleteness, VISIBILITY_THRESHOLD } from "@/lib/completeness";

// Lifecycle (2026-10-06): recompute every stored Search Score under the new weights. Dry run → CSV; --apply writes.
(async () => {
  const apply = process.argv.includes("--apply");
  const rows = await prisma.providerProfile.findMany({ select: { id: true, completeness: true, person: { select: { first_name: true, last_name: true, user: { select: { email: true, is_test: true } } } } } });
  const out = [["profile_id", "name", "email", "test", "old", "new", "visible_before", "visible_after"]];
  let changed = 0;
  for (const r of rows) {
    const input = await buildCompletenessInput(r.id);
    if (!input) continue;
    const next = computeProviderCompleteness(input);
    if (next === r.completeness) continue;
    changed++;
    out.push([r.id, `${r.person.first_name ?? ""} ${r.person.last_name ?? ""}`.trim(), r.person.user?.email ?? "", String(!!r.person.user?.is_test), String(r.completeness), String(next), String(r.completeness >= VISIBILITY_THRESHOLD), String(next >= VISIBILITY_THRESHOLD)]);
    if (apply) await recomputeCompleteness(r.id);
  }
  mkdirSync("docs/catalog", { recursive: true });
  const path = "docs/catalog/score_reweight_2026-10-06.csv";
  writeFileSync(path, out.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n");
  const hid = out.slice(1).filter((r) => r[6] === "true" && r[7] === "false");
  console.log(`${apply ? "APPLIED" : "dry run"} — ${rows.length} profiles, ${changed} change, ${hid.length} lose visibility (${hid.filter((r) => r[3] === "false").length} real) → ${path}`);
  process.exit(0);
})();
