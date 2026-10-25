import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// PE-E002: each ERP connection's PO inbox — po+{token}@PO_INBOUND_DOMAIN. Rotate replaces the token (the old address stops working).
const ALNUM = "abcdefghjkmnpqrstuvwxyz23456789";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "erp";

export const poDomain = () => process.env.PO_INBOUND_DOMAIN || "orders.panameer.com";
export const poAddress = (token: string | null | undefined) => (token ? `po+${token}@${poDomain()}` : null);

async function freshToken(name: string): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const t = `${slug(name)}-${Array.from(randomBytes(4), (b) => ALNUM[b % ALNUM.length]).join("")}`;
    if (!(await prisma.erpConnection.findFirst({ where: { po_email_token: t }, select: { id: true } }))) return t;
  }
  throw new Error("Couldn't make a unique PO email token — try again.");
}

/** The connection's token, generated on first view. */
export async function ensurePoToken(connectionId: string): Promise<string | null> {
  const c = await prisma.erpConnection.findUnique({ where: { id: connectionId }, select: { name: true, kind: true, po_email_token: true } });
  if (!c || c.kind === "SETUP") return null;
  if (c.po_email_token) return c.po_email_token;
  const t = await freshToken(c.name);
  await prisma.erpConnection.update({ where: { id: connectionId }, data: { po_email_token: t } });
  return t;
}

export async function rotatePoToken(connectionId: string): Promise<string> {
  const c = await prisma.erpConnection.findUniqueOrThrow({ where: { id: connectionId }, select: { name: true } });
  const t = await freshToken(c.name);
  await prisma.erpConnection.update({ where: { id: connectionId }, data: { po_email_token: t } });
  return t;
}

/** The connection a PO email was sent to, from po+{token}@… in any To address. */
export async function connectionForAddresses(to: string[]) {
  for (const a of to) {
    const m = /po\+([a-z0-9-]+)@/i.exec(a);
    if (!m) continue;
    const c = await prisma.erpConnection.findFirst({ where: { po_email_token: m[1].toLowerCase(), kind: "ERP" } });
    if (c) return c;
  }
  return null;
}
