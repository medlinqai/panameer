import type { WorkMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { taxonomyV2 } from "@/lib/platform-settings";

// GT-E004: provider capabilities (Global Taxonomy, behind `taxonomy_v2`). A capability = Domain (+ optional Skill)
// + optional System item + Mode (+ optional Role). LEGACY rows come from today's skills and wait for "Confirm".
export const MODE_VERB: Record<WorkMode, string> = { IMPLEMENT: "Implements", SUPPORT: "Supports", OPERATE: "Does the work in" };
export const MODE_CHOICE: Record<WorkMode, string> = { IMPLEMENT: "I implement it", SUPPORT: "I support it", OPERATE: "I do the work" };

export class CapabilityError extends Error {}

async function me(viewer: Viewer) {
  if (!(await taxonomyV2())) throw new CapabilityError("Not available");
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) throw new CapabilityError("No provider profile");
  return p;
}

const INCLUDE = {
  domain: { select: { id: true, process: true, name: true } },
  knowledgeSkill: { select: { id: true, name: true } },
  systemItem: { select: { id: true, name: true, product: { select: { name: true, vendor: { select: { name: true } } } } } },
  workRole: { select: { id: true, name: true } },
} as const;

type Row = Awaited<ReturnType<typeof prisma.providerCapability.findMany<{ include: typeof INCLUDE }>>>[number];

/** "Supports Oracle Fusion Cloud Payables · Invoice Processing & Matching". */
export function capabilityLine(c: Row): string {
  const system = c.systemItem ? `${c.systemItem.product.vendor.name === "Cross-Vendor" ? "" : `${c.systemItem.product.vendor.name} `}${c.systemItem.product.name} ${c.systemItem.name}`.trim() : null;
  const what = [c.domain?.name, c.knowledgeSkill?.name].filter(Boolean).join(" › ");
  const head = system ? `${MODE_VERB[c.mode]} ${system}` : c.workRole ? `${c.workRole.name}` : what ? `${MODE_VERB[c.mode]} ${what}` : MODE_VERB[c.mode];
  const tail = system ? what : c.workRole ? what : "";
  return tail ? `${head} · ${tail}` : head;
}

export async function capabilitiesFor(profileId: string) {
  const rows = await prisma.providerCapability.findMany({ where: { provider_profile_id: profileId }, include: INCLUDE, orderBy: [{ confirmed_at: { sort: "desc", nulls: "last" } }, { created_at: "asc" }] });
  return rows.map((c) => ({
    id: c.id, line: capabilityLine(c), mode: c.mode, source: c.source, confirmed: !!c.confirmed_at || c.source === "SELF",
    // For grouped display: "Implements · Oracle Fusion Cloud" › Procure-to-Pay › Purchase Orders.
    system: c.systemItem ? `${c.systemItem.product.vendor.name === "Cross-Vendor" ? "" : `${c.systemItem.product.vendor.name} `}${c.systemItem.product.name}`.trim() : null,
    process: c.domain?.process ?? null,
    label: c.systemItem?.name ?? c.workRole?.name ?? [c.domain?.name, c.knowledgeSkill?.name].filter(Boolean).join(" › ") ?? "",
  }));
}

/** The three pickers' options: processes › domains › skills, vendors › products › items (with domain), roles by mode. */
export async function capabilityOptions() {
  const [domains, skills, vendors, roles] = await Promise.all([
    prisma.domain.findMany({ orderBy: [{ process: "asc" }, { sort_order: "asc" }, { name: "asc" }], select: { id: true, process: true, name: true } }),
    prisma.knowledgeSkill.findMany({ where: { hidden: false }, orderBy: [{ sort_order: "asc" }, { name: "asc" }], select: { id: true, name: true, domain_id: true } }),
    prisma.systemVendor.findMany({ where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { id: true, name: true, products: { where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { id: true, name: true, items: { where: { hidden: false }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, domain_id: true } } } } } }),
    prisma.workRole.findMany({ where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { id: true, name: true, mode: true } }),
  ]);
  return { domains, skills, vendors, roles };
}

export async function myCapabilities(viewer: Viewer) {
  const p = await me(viewer);
  return capabilitiesFor(p.id);
}

export async function addCapability(viewer: Viewer, input: { mode: WorkMode; domainId: string; knowledgeSkillId?: string | null; systemItemId?: string | null; workRoleId?: string | null }) {
  const p = await me(viewer);
  const [d, ks, item, role] = await Promise.all([
    prisma.domain.findUnique({ where: { id: input.domainId }, select: { id: true } }),
    input.knowledgeSkillId ? prisma.knowledgeSkill.findFirst({ where: { id: input.knowledgeSkillId, domain_id: input.domainId }, select: { id: true } }) : null,
    input.systemItemId ? prisma.systemItem.findUnique({ where: { id: input.systemItemId }, select: { id: true } }) : null,
    input.workRoleId ? prisma.workRole.findFirst({ where: { id: input.workRoleId, mode: input.mode }, select: { id: true } }) : null,
  ]);
  if (!d) throw new CapabilityError("Pick what you know");
  const dup = await prisma.providerCapability.findFirst({ where: { provider_profile_id: p.id, domain_id: d.id, mode: input.mode, knowledge_skill_id: ks?.id ?? null, system_item_id: item?.id ?? null }, select: { id: true } });
  if (dup) throw new CapabilityError("That's already on your profile");
  await prisma.providerCapability.create({ data: { provider_profile_id: p.id, domain_id: d.id, knowledge_skill_id: ks?.id ?? null, system_item_id: item?.id ?? null, work_role_id: role?.id ?? null, mode: input.mode, source: "SELF", confirmed_at: new Date() } });
}

/** Scott 10-14: tick many at once. One capability per system item (its own domain if it has one among the picks,
 *  else the first picked domain), plus one per picked domain no item covers. Already-there rows are skipped, not errors. */
export async function addCapabilities(viewer: Viewer, input: { mode: WorkMode; domainIds: string[]; systemItemIds: string[]; workRoleId?: string | null }) {
  if (!input.domainIds.length) throw new CapabilityError("Pick what you know");
  const items = await prisma.systemItem.findMany({ where: { id: { in: input.systemItemIds } }, select: { id: true, domain_id: true } });
  const pairs: { domainId: string; systemItemId: string | null }[] = items.map((i) => ({ domainId: i.domain_id && input.domainIds.includes(i.domain_id) ? i.domain_id : i.domain_id ?? input.domainIds[0], systemItemId: i.id }));
  for (const d of input.domainIds) if (!pairs.some((x) => x.domainId === d)) pairs.push({ domainId: d, systemItemId: null });
  let added = 0;
  for (const x of pairs) {
    try { await addCapability(viewer, { mode: input.mode, domainId: x.domainId, systemItemId: x.systemItemId, workRoleId: input.workRoleId }); added++; }
    catch (e) { if (!(e instanceof CapabilityError) || !/already/.test(e.message)) throw e; }
  }
  return added;
}

/** "Confirm" on a LEGACY / résumé capability — optionally correcting the mode. */
export async function confirmCapability(viewer: Viewer, id: string, mode?: WorkMode) {
  const p = await me(viewer);
  const n = await prisma.providerCapability.updateMany({ where: { id, provider_profile_id: p.id }, data: { confirmed_at: new Date(), ...(mode ? { mode } : {}) } });
  if (!n.count) throw new CapabilityError("That isn't on your profile");
}

export async function removeCapability(viewer: Viewer, id: string) {
  const p = await me(viewer);
  await prisma.providerCapability.deleteMany({ where: { id, provider_profile_id: p.id } });
}

/** Résumé verbs → mode: implemented/configured → Implement, supported/maintained → Support, processed/managed → Do the Work. */
export function guessMode(text: string): WorkMode {
  const t = text.toLowerCase();
  const count = (re: RegExp) => (t.match(re) ?? []).length;
  const imp = count(/\b(implement|configur|deploy|design|migrat|roll[- ]?out|build|built|integrat)\w*/g);
  const sup = count(/\b(support|maintain|troubleshoot|resolv|help ?desk|ticket|administer)\w*/g);
  const ops = count(/\b(process(ed|ing)?|managed?|reconcil|post(ed|ing)|pay(roll|ables)|purchas|schedul)\w*/g);
  if (sup > imp && sup >= ops) return "SUPPORT";
  if (ops > imp && ops > sup) return "OPERATE";
  return "IMPLEMENT";
}

/** GT-E004: after the résumé matched Skills as today, translate each matched skill → capability through legacy_skill_id
 *  (the backfill's map), mode guessed from the text it came from; saved unconfirmed. Off when the switch is off. */
export async function capabilitiesFromSkills(profileId: string, picks: { skillIds: string[]; text: string }[]) {
  if (!(await taxonomyV2())) return 0;
  const ids = [...new Set(picks.flatMap((p) => p.skillIds))];
  if (!ids.length) return 0;
  const [ks, items, roles] = await Promise.all([
    prisma.knowledgeSkill.findMany({ where: { legacy_skill_id: { in: ids } }, select: { id: true, domain_id: true, legacy_skill_id: true } }),
    prisma.systemItem.findMany({ where: { legacy_skill_id: { in: ids } }, select: { id: true, domain_id: true, legacy_skill_id: true } }),
    prisma.workRole.findMany({ where: { legacy_skill_id: { in: ids } }, select: { id: true, mode: true, legacy_skill_id: true } }),
  ]);
  const legacyDomains = await prisma.providerCapability.findMany({ where: { legacy_skill_id: { in: ids }, domain_id: { not: null }, knowledge_skill_id: null, system_item_id: null, work_role_id: null }, distinct: ["legacy_skill_id"], select: { legacy_skill_id: true, domain_id: true } });
  let n = 0;
  for (const p of picks) {
    const mode = guessMode(p.text);
    for (const sid of p.skillIds) {
      const k = ks.find((x) => x.legacy_skill_id === sid), it = items.find((x) => x.legacy_skill_id === sid), r = roles.find((x) => x.legacy_skill_id === sid), d = legacyDomains.find((x) => x.legacy_skill_id === sid);
      if (!k && !it && !r && !d) continue;
      const data = { provider_profile_id: profileId, legacy_skill_id: sid, domain_id: k?.domain_id ?? it?.domain_id ?? d?.domain_id ?? null, knowledge_skill_id: k?.id ?? null, system_item_id: it?.id ?? null, work_role_id: r?.id ?? null, mode: r?.mode ?? mode, source: "LEGACY" as const };
      const made = await prisma.providerCapability.createMany({ data: [data], skipDuplicates: true });
      n += made.count;
    }
  }
  return n;
}
