import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { NextResponse } from "next/server";

/**
 * CSV of the audit log, same filters as the page (`P2-ALL-E814`).
 *
 * CSV rather than a real `.xlsx`: Excel opens it directly, it streams without a
 * dependency, and the columns here are all text and numbers. A workbook would
 * buy formatting nobody asked for.
 */
export async function GET(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const actor = url.searchParams.get("actor");
  const table = url.searchParams.get("table");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rows = await prisma.adminAudit.findMany({
    where: {
      ...(actor ? { actor_email: { contains: actor, mode: "insensitive" } } : {}),
      ...(table ? { target_table: table } : {}),
      ...(from || to
        ? {
            created_at: {
              ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59Z`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: 5000,
  });

  /** Quote everything and double any quote inside — a detail field holds JSON
   *  with commas in it, and an unquoted CSV would split a row mid-value. */
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [
    ["When", "Actor", "Action", "Table", "Target", "Rows", "Detail"].join(","),
    ...rows.map((r) =>
      [
        cell(r.created_at.toISOString()),
        cell(r.actor_email ?? "system"),
        cell(r.action),
        cell(r.target_table),
        cell(r.target_id),
        cell(r.row_count),
        cell(r.detail ? JSON.stringify(r.detail) : ""),
      ].join(","),
    ),
  ].join("\r\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
