import { prisma } from "@/lib/prisma";
import { SKILL_AREAS } from "@/lib/skill-areas";
import type { WriteResult } from "@/lib/catalog-write";

// Skill areas, admin-managed: add, rename (code changes move every skill in one transaction), reorder, hide. No delete.
export type AreaRow = { id: string; code: string; label: string; hidden: boolean; sort: number };
export const AREA_CODE = /^[A-Z0-9_]{2,16}$/;

/** Seeds the 8 starting areas once (same codes, so existing Skill.area values keep working). */
export async function seedSkillAreas() {
  if (await prisma.skillArea.count()) return;
  await prisma.skillArea.createMany({ data: SKILL_AREAS.map((a, i) => ({ code: a.code, label: a.label, sort_order: (i + 1) * 10 })), skipDuplicates: true });
}

export async function getSkillAreas(): Promise<AreaRow[]> {
  await seedSkillAreas();
  const rows = await prisma.skillArea.findMany({ orderBy: [{ sort_order: "asc" }, { label: "asc" }] });
  return rows.map((r) => ({ id: r.id, code: r.code, label: r.label, hidden: r.hidden, sort: r.sort_order }));
}

export const codeFrom = (label: string) => {
  const words = label.toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const c = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 8);
  return c.length >= 2 ? c.slice(0, 16) : (words.join("_") + "_X").slice(0, 16);
};

async function freeCode(base: string) {
  for (let i = 0; i < 50; i++) {
    const c = (i ? `${base}${i + 1}` : base).slice(0, 16);
    if (!(await prisma.skillArea.findUnique({ where: { code: c } }))) return c;
  }
  return `${base.slice(0, 10)}${Date.now() % 100000}`;
}

export async function addArea(label: string, code?: string | null): Promise<WriteResult & { code?: string }> {
  const name = label.trim().replace(/\s+/g, " ");
  if (name.length < 2) return { ok: false, error: "An area needs a name." };
  if (await prisma.skillArea.findFirst({ where: { label: { equals: name, mode: "insensitive" } } })) return { ok: false, error: `"${name}" is already an area.` };
  const wanted = code?.trim().toUpperCase();
  if (wanted && !AREA_CODE.test(wanted)) return { ok: false, error: "Short code: 2–16 letters, numbers or _." };
  if (wanted && (await prisma.skillArea.findUnique({ where: { code: wanted } }))) return { ok: false, error: `Code ${wanted} is taken.` };
  const max = await prisma.skillArea.aggregate({ _max: { sort_order: true } });
  const row = await prisma.skillArea.create({ data: { label: name, code: wanted || (await freeCode(codeFrom(name))), sort_order: (max._max.sort_order ?? 0) + 10 } });
  return { ok: true, id: row.id, code: row.code, message: `Added area "${row.label}" (${row.code}).` };
}

export async function updateArea(id: string, p: { label?: string; code?: string }): Promise<WriteResult & { code?: string }> {
  const row = await prisma.skillArea.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "That area no longer exists." };
  const label = p.label?.trim().replace(/\s+/g, " ") ?? row.label;
  const code = p.code?.trim().toUpperCase() ?? row.code;
  if (label.length < 2) return { ok: false, error: "An area needs a name." };
  if (!AREA_CODE.test(code)) return { ok: false, error: "Short code: 2–16 letters, numbers or _." };
  if (code !== row.code && (await prisma.skillArea.findUnique({ where: { code } }))) return { ok: false, error: `Code ${code} is taken.` };
  if (label.toLowerCase() !== row.label.toLowerCase() && (await prisma.skillArea.findFirst({ where: { label: { equals: label, mode: "insensitive" }, NOT: { id } } }))) return { ok: false, error: `"${label}" is already an area.` };
  const moved = await prisma.$transaction(async (tx) => {
    await tx.skillArea.update({ where: { id }, data: { label, code } });
    return code !== row.code ? (await tx.skill.updateMany({ where: { area: row.code }, data: { area: code } })).count : 0;
  });
  return { ok: true, id, code, message: `Saved "${label}" (${code})${moved ? ` — ${moved} skill${moved === 1 ? "" : "s"} moved to the new code` : ""}.` };
}

export async function moveArea(id: string, dir: "up" | "down"): Promise<WriteResult> {
  const rows = await prisma.skillArea.findMany({ orderBy: [{ sort_order: "asc" }, { label: "asc" }], select: { id: true } });
  const i = rows.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true, id, message: "Already there." };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await prisma.$transaction(rows.map((r, k) => prisma.skillArea.update({ where: { id: r.id }, data: { sort_order: (k + 1) * 10 } })));
  return { ok: true, id, message: "Moved." };
}

export async function setAreaHidden(id: string, hidden: boolean): Promise<WriteResult> {
  const row = await prisma.skillArea.update({ where: { id }, data: { hidden } }).catch(() => null);
  if (!row) return { ok: false, error: "That area no longer exists." };
  return { ok: true, id, message: hidden ? `"${row.label}" is hidden from pickers; its skills keep it.` : `"${row.label}" is shown again.` };
}

export async function isAreaCode(code: string | null | undefined) {
  return code == null || !!(await prisma.skillArea.findUnique({ where: { code } }));
}
