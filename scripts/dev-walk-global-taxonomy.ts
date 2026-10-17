// GT dev walk. Switch OFF (the real, shared switch): the app is today's — no capabilities API, no Shop › Services.
// Switch ON is tested in-process with TAXONOMY_V2_FORCE=1 (local only), so real users never see it flip:
// a new seller adds "I support it · Invoice Processing & Matching · Oracle › Fusion Cloud › Payables", the profile line
// and Shop › Services filter find them, résumé translation saves an unconfirmed capability; iamscottwalls has LEGACY ones.
// Run: npx tsx --env-file=.env.local scripts/dev-walk-global-taxonomy.ts  (dev server on :3100)
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/platform-settings";
import { addCapability, capabilitiesFor, capabilitiesFromSkills } from "@/lib/capabilities";
import { listServiceProviders } from "@/lib/shop-services";
import { check, cleanup, done, party } from "./lib/dev-fixture";

const BASE = "http://localhost:3100";

async function main() {
  const s = await party("PROVIDER", "Gia");
  const person = await prisma.person.update({ where: { id: s.personId }, data: { is_service_provider: true }, select: { user_id: true } });
  const cookie = `next-auth.session-token=${await encode({ token: { sub: person.user_id!, email: s.email, role: "MEMBER", isServiceProvider: true }, secret: process.env.NEXTAUTH_SECRET! })}`;
  const get = (path: string) => fetch(BASE + path, { headers: { cookie }, redirect: "manual" });

  // ── switch OFF: today's app ──
  check("taxonomy_v2 is off (the shared switch)", (await getSetting("taxonomy_v2")) === false);
  check("off: capabilities API says disabled (the editor renders nothing)", (await (await get("/api/provider/capabilities")).json()).enabled === false);
  check("off: Shop › Services doesn't exist", (await get("/shop/services")).status === 404);
  const shop = await (await get("/shop")).text();
  check("off: Shop tabs unchanged (no Services tab)", !shop.includes('href="/shop/services"'));
  check("off: My Catalog and Profile › Skills still load", (await get("/catalog")).status === 200 && (await get("/profile/edit/skills")).status === 200);

  // ── switch ON (local override) ──
  process.env.TAXONOMY_V2_FORCE = "1";
  const domain = await prisma.domain.findFirstOrThrow({ where: { process: "Procure-to-Pay", name: "Invoice Processing & Matching" } });
  const item = await prisma.systemItem.findFirstOrThrow({ where: { name: "Payables", product: { name: "Fusion Cloud", vendor: { name: "Oracle" } } }, include: { product: true } });
  await addCapability(s.viewer, { mode: "SUPPORT", domainId: domain.id, systemItemId: item.id });
  const lines = await capabilitiesFor(s.profileId!);
  check("on: profile line reads as the brief", lines[0]?.line === "Supports Oracle Fusion Cloud Payables · Invoice Processing & Matching", lines[0]?.line);
  await prisma.providerService.create({ data: { provider_profile_id: s.profileId!, name: "Offsite Hourly", service_type: "SERVICE_BY_QTY", uom: "HOUR", rate_cents: 11000, published_at: new Date() } });
  const found = await listServiceProviders({ mode: "SUPPORT", domain: domain.id, vendor: item.product.vendor_id }, { seesTest: true });
  check("on: Shop › Services filter (Support · Invoice Processing · Oracle) finds them", found.some((r) => r.profileId === s.profileId && r.capabilities.includes(lines[0].line)));
  const other = await listServiceProviders({ mode: "IMPLEMENT", domain: domain.id }, { seesTest: true });
  check("on: …and Implement doesn't", !other.some((r) => r.profileId === s.profileId));
  const legacyItem = await prisma.systemItem.findFirst({ where: { legacy_skill_id: { not: null }, NOT: { id: item.id } }, select: { id: true, legacy_skill_id: true, name: true } });
  if (legacyItem) {
    const n = await capabilitiesFromSkills(s.profileId!, [{ skillIds: [legacyItem.legacy_skill_id!], text: "Supported and maintained the module; resolved tickets." }]);
    const c = await prisma.providerCapability.findFirst({ where: { provider_profile_id: s.profileId!, system_item_id: legacyItem.id } });
    check(`on: résumé skill (${legacyItem.name}) → capability, mode guessed Support, unconfirmed`, n === 1 && c?.mode === "SUPPORT" && !c.confirmed_at && c.source === "LEGACY");
  }
  const u = await prisma.user.findFirst({ where: { email: { startsWith: "iamscottwalls" } }, select: { person: { select: { providerProfile: { select: { id: true } } } } } });
  const pid = u?.person?.providerProfile?.id;
  if (pid) {
    const mine = await capabilitiesFor(pid);
    console.log(`    iamscottwalls: ${mine.length} capabilities, ${mine.filter((c) => !c.confirmed).length} waiting for Confirm · e.g. ${mine.slice(0, 2).map((c) => c.line).join(" | ")}`);
    check("on: iamscottwalls sees LEGACY capabilities with Confirm", mine.some((c) => !c.confirmed));
  }
  delete process.env.TAXONOMY_V2_FORCE;
  check("the shared switch is still off", (await getSetting("taxonomy_v2")) === false);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await cleanup(); done("Global Taxonomy walk"); await prisma.$disconnect(); });
