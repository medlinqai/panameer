import { NextResponse } from "next/server";
import type { z } from "zod";
import { guardApi } from "@/lib/guard";
import { SettingsError } from "@/lib/settings";
import type { Viewer } from "@/lib/access";

/**
 * The shape every Settings write shares (J2.4 WS-H).
 *
 * Seven routes doing gate → parse → act → map-errors, and the interesting part
 * of each is the middle line. Factored out because seven hand-written copies is
 * seven chances for one of them to forget the capability gate — the failure
 * mode here is silent and total, and the only reliable defence is not writing
 * it out eight times.
 *
 * The gate is `canProvideServices` for all of them: these are provider settings
 * and `/settings` is mapped to that capability at the edge and in the layout.
 * Keeping it here as well is the third of the three, and the authoritative one
 * for an API route — the edge does not reliably cover these.
 */
export async function settingsWrite<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
  action: (viewer: Viewer, input: z.infer<S>) => Promise<unknown>
): Promise<NextResponse> {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 400 }
    );
  }

  try {
    const result = await action(gate, parsed.data);
    return NextResponse.json({ ok: true, result: result ?? null });
  } catch (e) {
    if (e instanceof SettingsError) {
      // GATED is a rule the user can satisfy (add a tax form first); NOT_FOUND
      // and INVALID are the request being wrong. Both are the caller's to fix,
      // so both are 400 — a 403 would suggest the account lacks permission,
      // which is a different and more alarming thing to tell someone.
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[settings] write failed:", e);
    return NextResponse.json(
      { error: "We couldn't save that. Please try again." },
      { status: 500 }
    );
  }
}
