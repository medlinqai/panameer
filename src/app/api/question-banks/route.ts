import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { SourcingError } from "@/lib/sourcing";
import { deleteBank, duplicateBank, listBanks, saveBank } from "@/lib/question-banks";

// QB-E004: list / save / duplicate / delete Question Banks (owner-scoped from the session).
type Body = { action?: string; id?: string | null; name?: string; questions?: unknown; shared?: boolean };

export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const body = (await request.json().catch(() => ({}))) as Body;
  try {
    switch (body.action) {
      case "list": return NextResponse.json({ banks: await listBanks(gate) });
      case "save": return NextResponse.json(await saveBank(gate, { id: body.id ?? null, name: String(body.name ?? ""), questions: body.questions ?? [], shared: !!body.shared }));
      case "duplicate": return NextResponse.json(await duplicateBank(gate, String(body.id ?? "")));
      case "delete": await deleteBank(gate, String(body.id ?? "")); return NextResponse.json({ ok: true });
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return apiError(e, "question-banks", [SourcingError]);
  }
}
