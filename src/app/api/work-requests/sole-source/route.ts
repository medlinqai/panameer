import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { hireSoleSourced, HireError } from "@/lib/sole-source";

export async function POST(req: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;

  let providerPersonId = "";
  try {
    const body = (await req.json()) as { providerPersonId?: unknown };
    providerPersonId = typeof body.providerPersonId === "string" ? body.providerPersonId : "";
  } catch {
    return NextResponse.json({ error: "Expected JSON", code: "BAD_BODY" }, { status: 400 });
  }

  try {
    const result = await hireSoleSourced(gate, providerPersonId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HireError) {
      const status = e.code === "NOT_A_BUYER" || e.code === "OWN_PROFILE" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const code = (e as { code?: string })?.code;
    if (code === "NOT_A_BUYER") {
      return NextResponse.json({ error: "Not a buyer", code }, { status: 403 });
    }
    console.error("[sole-source] failed:", e);
    return NextResponse.json({ error: "Could not start the request" }, { status: 500 });
  }
}
