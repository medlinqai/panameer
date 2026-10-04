import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  TestAccountError,
  createTestSet,
  expectedConfirmation,
  previewRemovable,
  removeTestAccounts,
  setTestFlag,
} from "@/lib/admin/test-accounts";

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";

  try {
    switch (action) {
      case "preview": {
        const rows = await previewRemovable();
        return NextResponse.json({ ok: true, rows, confirmation: expectedConfirmation(rows.length) });
      }
      case "create":
        return NextResponse.json({ ok: true, ...(await createTestSet(gate)) });
      case "remove":
        return NextResponse.json({
          ok: true,
          ...(await removeTestAccounts(gate, String(body.confirmation ?? ""))),
        });
      case "set-flag":
        await setTestFlag(
          gate,
          String(body.userId ?? ""),
          body.isTest === true,
          body.acknowledgedRealAccount === true,
        );
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof TestAccountError) {
      /** ⚠ The reason reaches the screen — "Type REMOVE 9 to confirm" is
       *  unactionable as a generic 400. */
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[test-accounts] unexpected", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
