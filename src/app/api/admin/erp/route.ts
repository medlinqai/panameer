import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { listConnections, saveConnection } from "@/lib/erp/connections";

const CONN = z.object({
  pAccountId: z.string().uuid(),
  name: z.string().min(1).max(200),
  fromIdentity: z.string().min(1).max(200),
  senderIdentity: z.string().min(1).max(200),
  toIdentity: z.string().max(200).optional().nullable(),
  fromDomain: z.string().max(60).optional().nullable(),
  senderDomain: z.string().max(60).optional().nullable(),
  outboundCxmlUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  oracleRestBaseUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  credentialEnvName: z.string().max(64).optional().nullable(),
  active: z.boolean().optional(),
  newSecret: z.string().min(16).max(200).optional().nullable().or(z.literal("")),
});
const BODY = z.object({ id: z.string().uuid().nullable(), connection: CONN });

// X-E001: admin-only create/edit of ERP connections. The shared secret is hashed on save and never returned.
export async function POST(req: Request) {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: b.error.issues[0]?.message ?? "Check the fields" }, { status: 400 });
  try {
    const saved = await saveConnection(b.data.id, b.data.connection);
    await writeAudit(viewer, { action: b.data.id ? "erp_connection.update" : "erp_connection.create", targetTable: "erp_connections", detail: { id: saved.id, name: b.data.connection.name, secretRotated: !!b.data.connection.newSecret }, rowCount: 1 });
    return NextResponse.json({ connections: await listConnections() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
