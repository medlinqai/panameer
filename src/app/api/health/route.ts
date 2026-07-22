import { NextResponse } from "next/server";

/** Simple liveness check — visit http://localhost:3100/api/health */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "panameer-digital-services",
    port: 3100,
    timestamp: new Date().toISOString(),
  });
}
