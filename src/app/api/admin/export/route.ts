import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { jobLabel } from "@/lib/user-jobs";

export const maxDuration = 60;

export async function GET(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const list = url.searchParams.get("list") ?? "users";
  if (list !== "users") {
    return NextResponse.json({ error: `Nothing to export called "${list}".` }, { status: 400 });
  }

  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const testFilter = url.searchParams.get("test");

  const people = await prisma.person.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
      title: true,
      phone: true,
      created_at: true,
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      requesterProfile: { select: { id: true } },
      buyerProfile: { select: { id: true } },
      company: { select: { name: true } },
      user: {
        select: {
          email: true,
          email_verified: true,
          is_test: true,
          is_active: true,
          locked: true,
          last_login: true,
          is_system_admin: true,
        },
      },
    },
  });

  let rows = people;
  if (testFilter === "real" || testFilter === "test") {
    rows = rows.filter((p) => (p.user?.is_test === true) === (testFilter === "test"));
  }
  if (q) {
    rows = rows.filter((p) =>
      [
        p.first_name,
        p.last_name,
        `${p.first_name ?? ""} ${p.last_name ?? ""}`,
        p.user?.email,
        p.company?.name,
        p.title,
        p.phone,
        p.id,
        p.user_id ?? "",
        jobLabel(p),
        p.user?.is_test ? "test" : "real",
      ].some((v) => (v ?? "").toString().toLowerCase().includes(q)),
    );
  }

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Users");
  sheet.addRow([
    "Name", "Email", "Company", "Title", "Job", "Phone",
    "Test", "Active", "Locked", "Email verified", "Admin",
    "Last sign-in", "Created", "Person id", "User id",
  ]);
  sheet.getRow(1).font = { bold: true };
  for (const p of rows) {
    sheet.addRow([
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      p.user?.email ?? "",
      p.company?.name ?? "",
      p.title ?? "",
      jobLabel(p),
      p.phone ?? "",
      /** ⚠ Words, not TRUE/FALSE — the file is read by a person, and "TRUE"
       *  in a column called Test is ambiguous about which way it points. */
      p.user?.is_test ? "TEST" : "real",
      p.user?.is_active === false ? "deactivated" : "active",
      p.user?.locked ? "locked" : "",
      p.user?.email_verified ? "yes" : "no",
      p.user?.is_system_admin ? "admin" : "",
      p.user?.last_login ? p.user.last_login.toISOString().slice(0, 16).replace("T", " ") : "",
      p.created_at.toISOString().slice(0, 10),
      p.id,
      p.user_id ?? "",
    ]);
  }
  sheet.columns.forEach((c, i) => {
    c.width = [26, 30, 24, 20, 20, 16, 8, 12, 9, 14, 8, 18, 12, 38, 38][i] ?? 16;
  });

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="panameer-users-${stamp}.xlsx"`,
      /** ⚠⚠ Never cached: it carries real email addresses. */
      "Cache-Control": "no-store",
    },
  });
}
