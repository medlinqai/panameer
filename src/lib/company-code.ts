import { prisma } from "@/lib/prisma";

// NB-E000: a company's code in every transaction number — 3 to 6 uppercase letters/digits, unique across Panameer.
export const CODE_RE = /^[A-Z0-9]{3,6}$/;
const STOP = /\b(INC|LLC|LTD|CORP|CORPORATION|CO|COMPANY|THE|AND|GROUP|SA|PLC|GMBH)\b/g;

export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

async function taken(code: string, exceptCompanyId?: string) {
  return !!(await prisma.company.findFirst({ where: { code, ...(exceptCompanyId ? { NOT: { id: exceptCompanyId } } : {}) }, select: { id: true } }));
}

/** From the name: the first 5 letters/digits (StratERP → STRAT); on a clash the last character changes (STRA2, STRA3… then STRAA…). */
export async function suggestCode(name: string, exceptCompanyId?: string): Promise<string> {
  let base = name.toUpperCase().replace(STOP, " ").replace(/[^A-Z0-9]/g, "").slice(0, 5);
  if (base.length < 3) base = (base + "XXX").slice(0, 3);
  if (!(await taken(base, exceptCompanyId))) return base;
  const stem = base.slice(0, -1);
  for (const c of "23456789ABCDEFGHJKLMNPQRSTUVWXYZ") {
    const code = stem + c;
    if (code !== base && !(await taken(code, exceptCompanyId))) return code;
  }
  for (let n = 1; n < 1000; n++) {
    const code = (base.slice(0, 3) + String(n)).slice(0, 6);
    if (!(await taken(code, exceptCompanyId))) return code;
  }
  throw new Error("No free code");
}

export async function codeAvailable(raw: string, exceptCompanyId?: string): Promise<{ code: string; ok: boolean; reason: string | null }> {
  const code = normalizeCode(raw);
  if (!CODE_RE.test(code)) return { code, ok: false, reason: "3 to 6 letters or digits" };
  if (await taken(code, exceptCompanyId)) return { code, ok: false, reason: "Taken" };
  return { code, ok: true, reason: null };
}

/** The company's code, given now from its name if it has none. */
export async function ensureCompanyCode(companyId: string): Promise<string> {
  const c = await prisma.company.findUnique({ where: { id: companyId }, select: { code: true, name: true } });
  if (!c) throw new Error("No company");
  if (c.code) return c.code;
  for (let i = 0; i < 5; i++) {
    const code = await suggestCode(c.name, companyId);
    const moved = await prisma.company.updateMany({ where: { id: companyId, code: null }, data: { code } });
    if (!moved.count) return (await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { code: true } })).code!;
    // A race could hand the same code to two companies — re-check and retry on a clash.
    if ((await prisma.company.count({ where: { code } })) === 1) return code;
    await prisma.company.update({ where: { id: companyId }, data: { code: null } });
  }
  throw new Error("Could not give this company a code");
}

/** Admins of the company (or Panameer admins) change it; numbers already issued keep the old code. */
export async function setCompanyCode(companyId: string, raw: string) {
  const v = await codeAvailable(raw, companyId);
  if (!v.ok) throw new Error(v.reason === "Taken" ? `${v.code} is taken` : "Use 3 to 6 letters or digits");
  await prisma.company.update({ where: { id: companyId }, data: { code: v.code } });
  return v.code;
}
