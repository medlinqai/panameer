import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PunchoutSessionLive } from "@/lib/erp/punchout";

// PI-E002/E003: the signed-in visitor's punch-in (from the JWT's punchoutSessionId) — live, returned or ended.
export type Punchin = { state: "live" | "returned" | "ended"; erpName: string; count: number; totalCents: number; session: PunchoutSessionLive | null };

/** A punch-in session by id, shaped like sessionFor's result (null once returned or expired). */
export async function sessionById(id: string | null | undefined): Promise<PunchoutSessionLive | null> {
  if (!id) return null;
  const s = await prisma.punchoutSession.findUnique({ where: { id } });
  if (!s || s.returned_at || s.expires_at < new Date()) return null;
  const conn = await prisma.erpConnection.findUnique({ where: { id: s.connection_id } });
  if (!conn?.active || conn.status === "SUSPENDED" || conn.kind === "SETUP") return null;
  return { ...s, connection: conn };
}

export async function currentPunchinId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as { punchoutSessionId?: string | null } | undefined)?.punchoutSessionId) ?? null;
}

export async function currentPunchin(): Promise<Punchin | null> {
  const id = await currentPunchinId();
  if (!id) return null;
  const row = await prisma.punchoutSession.findUnique({ where: { id }, select: { returned_at: true, expires_at: true, connection_id: true } });
  if (!row) return null;
  const conn = await prisma.erpConnection.findUnique({ where: { id: row.connection_id }, select: { name: true, erp_kind: true } });
  const erpName = conn?.erp_kind === "ORACLE_CLOUD" ? "Oracle Cloud" : conn?.name ?? "Your ERP";
  const live = await sessionById(id);
  if (!live) return { state: row.returned_at ? "returned" : "ended", erpName, count: 0, totalCents: 0, session: null };
  const { cartLines } = await import("@/lib/erp/cart");
  const lines = await cartLines(live);
  const totalCents = lines.reduce((n, l) => n + (l.transaction_type === "SERVICE_BY_AMT" ? l.amount_cents ?? 0 : Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0))), 0);
  return { state: "live", erpName, count: lines.length, totalCents, session: live };
}
