// NM-E009: requester_profiles → buyer_profiles (one Buyer). Dry run only: writes scripts/out/buyer_merge_dryrun.csv and stops.
// The merge runs only with --apply, by Scott, after the CSV and the target columns are approved.
// Run: npx tsx --env-file=.env.local scripts/buyer-merge.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

// Requester fields buyer_profiles doesn't have yet — the merge needs them added (additive) before --apply.
const MOVE = ["employee_id", "buyer_name", "buyer_email", "approver_name", "approver_email", "work_site_id", "onboarding_step", "completed_at", "dashboard_seen_at", "validation_status", "validation_requested_at", "validated_at", "overview", "work_history", "education"] as const;

async function main() {
  if (process.argv.includes("--apply")) {
    console.error("--apply is not built yet: approve the dry-run CSV and the target buyer_profiles columns first (NM-E009).");
    process.exit(2);
  }
  const people = await prisma.person.findMany({
    where: { OR: [{ requesterProfile: { isNot: null } }, { buyerProfile: { isNot: null } }] },
    select: { id: true, first_name: true, last_name: true, is_service_buyer: true, user: { select: { email: true, is_test: true } }, requesterProfile: true, buyerProfile: true },
  });
  const esc = (v: unknown) => { const s = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["person_id", "name", "email", "is_test", "is_service_buyer", "requester_profile_id", "buyer_profile_id", "action", "conflicts", "requester_fields_with_data"];
  const out = [head.join(",")];
  const tally: Record<string, number> = {};
  for (const p of people) {
    const r = p.requesterProfile, b = p.buyerProfile;
    const action = r && b ? "MERGE into existing buyer_profile" : r ? "CREATE buyer_profile from requester_profile" : "KEEP buyer_profile (no requester_profile)";
    const conflicts: string[] = [];
    if (r && b) conflicts.push("both profiles exist");
    if ((r || b) && !p.is_service_buyer) conflicts.push("buyer profile but is_service_buyer = false (role flag differs)");
    if (!p.user) conflicts.push("no sign-in (User) on this person");
    const withData = r ? MOVE.filter((k) => { const v = (r as Record<string, unknown>)[k]; return v != null && v !== "" && !(Array.isArray(v) && !v.length); }) : [];
    tally[action] = (tally[action] ?? 0) + 1;
    if (conflicts.length) tally["rows with conflicts"] = (tally["rows with conflicts"] ?? 0) + 1;
    out.push([p.id, `${p.first_name} ${p.last_name}`.trim(), p.user?.email ?? "", p.user?.is_test ?? "", p.is_service_buyer, r?.id ?? "", b?.id ?? "", action, conflicts.join("; "), withData.join(" ")].map(esc).join(","));
  }
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/buyer_merge_dryrun.csv", out.join("\n") + "\n");
  console.log(JSON.stringify({ rows: people.length, ...tally, target_columns_to_add: MOVE.length, written: "scripts/out/buyer_merge_dryrun.csv" }));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
