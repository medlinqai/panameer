import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { moveHelpLink, saveHelpLink, setHelpLinkActive, type HelpLinkInput } from "@/lib/help-links";

// SH2-E008: Admin › Help Links writes (admins only).
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const b = (await request.json().catch(() => ({}))) as { action?: string; id?: string; input?: HelpLinkInput; dir?: "up" | "down"; active?: boolean };
  try {
    if (b.action === "save") return NextResponse.json({ id: (await saveHelpLink(b.id ?? null, b.input!)).id });
    if (b.action === "move" && b.id && b.dir) { await moveHelpLink(b.id, b.dir); return NextResponse.json({ ok: true }); }
    if (b.action === "active" && b.id) { await setHelpLinkActive(b.id, !!b.active); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "That didn't save." }, { status: 400 });
  }
}
