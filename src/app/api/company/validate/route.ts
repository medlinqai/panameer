import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { validateEntity } from "@/lib/company-validation";

/**
 * POST /api/company/validate — look a company up on its state's corporate
 * register (`P1-J1.1-E282`).
 *
 * ⚠⚠ THIS ROUTE NEVER WRITES. It looks up and returns. `defineCompany()` remains
 * the only writer, and keeping the read and the write apart is what lets a user
 * correct a bad lookup before anything is persisted.
 *
 * ⚠ SIGNED-IN ONLY. It reaches an external register on every call, so it is not
 * an open endpoint — `authenticated` rather than a capability, because looking a
 * company up is not a role.
 *
 * ⚠ IT NEVER THROWS A REGISTRY FAILURE AT THE CALLER. `validateEntity` returns
 * `{ ok: false, reason }` — the same shape `ai-provider.ts` uses — and this hands
 * it back with a 200, because "we couldn't check" is an ANSWER the UI has to
 * render, not an error. ⚠ A FAILED LOOKUP NEVER BLOCKS `Continue` (decision 5),
 * and a non-200 would invite the client to treat it as one.
 */
const Body = z.object({
  name: z.string().trim().min(2).max(200),
  stateOfFiling: z.string().trim().min(2).max(60),
});

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "bad_input", message: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 200 }
    );
  }

  const result = await validateEntity(parsed.data);
  return NextResponse.json(result, { status: 200 });
}
