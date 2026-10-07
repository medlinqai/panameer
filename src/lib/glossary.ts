import { prisma } from "@/lib/prisma";

// The glossary: public page reads PUBLIC + not hidden; admin edits everything. No delete.
export const termKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");
export type GlossaryInput = { term: string; category?: string | null; type?: string | null; definition: string; alsoCalled?: string | null; dontSay?: string | null; visibility?: "PUBLIC" | "ADMIN"; hidden?: boolean; confirmNote?: string | null };
const clean = (s: string | null | undefined) => (s ?? "").trim() || null;

export async function publicGlossary() {
  return prisma.glossaryTerm.findMany({ where: { visibility: "PUBLIC", hidden: false }, orderBy: { term_key: "asc" }, select: { id: true, term: true, category: true, type: true, definition: true, also_called: true } });
}

export async function allGlossary() {
  return prisma.glossaryTerm.findMany({ orderBy: { term_key: "asc" } });
}

export async function saveTerm(id: string | null, p: GlossaryInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const term = p.term.trim().replace(/\s+/g, " ");
  const definition = p.definition.trim();
  if (term.length < 1 || !definition) return { ok: false, error: "A term and a definition are needed." };
  const key = termKey(term);
  const clash = await prisma.glossaryTerm.findUnique({ where: { term_key: key }, select: { id: true } });
  if (clash && clash.id !== id) return { ok: false, error: `"${term}" is already in the glossary.` };
  const data = {
    term,
    term_key: key,
    category: clean(p.category),
    type: clean(p.type),
    definition,
    also_called: clean(p.alsoCalled),
    dont_say: clean(p.dontSay),
    ...(p.visibility ? { visibility: p.visibility } : {}),
    ...(p.hidden !== undefined ? { hidden: p.hidden } : {}),
    ...(p.confirmNote !== undefined ? { confirm_note: clean(p.confirmNote) } : {}),
  };
  const row = id ? await prisma.glossaryTerm.update({ where: { id }, data }) : await prisma.glossaryTerm.create({ data });
  return { ok: true, id: row.id };
}

export async function setTermFlags(id: string, p: { hidden?: boolean; visibility?: "PUBLIC" | "ADMIN" }) {
  await prisma.glossaryTerm.update({ where: { id }, data: p });
  return { ok: true as const, id };
}
