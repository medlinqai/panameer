import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { rotateSetupSecret } from "@/lib/erp/setup";
import { listConnections } from "@/lib/erp/connections";

// ES-E001: Rotate the public setup credential's secret (shown on /erp/connect at once).
export async function POST() {
  const viewer = await guardApi("canAdminister");
  if (viewer instanceof NextResponse) return viewer;
  const secret = await rotateSetupSecret(viewer.userId);
  await writeAudit(viewer, { action: "erp_connection.setup_rotate", targetTable: "erp_connections", detail: { kind: "SETUP" }, rowCount: 1 });
  return NextResponse.json({ secret, connections: await listConnections() });
}
