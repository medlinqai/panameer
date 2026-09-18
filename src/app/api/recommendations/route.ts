import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import {
  RecommendationError,
  requestRecommendation,
  requestRecommendationFromColleague,
} from "@/lib/recommendations";

/**
 * POST /api/recommendations — ask a contact for a recommendation (WS-F / E012).
 *
 * OWNER-SCOPED through the lib: the request body carries a contact and a note,
 * never a profile id. There is nothing here a caller could point at somebody
 * else's record.
 */
/*
  ⚠⚠ TWO SHAPES, ONE ENDPOINT (`P2-J3-E558` WS-A).

  ⚠ `toUserId` — the COLLEAGUE ROW ask. The address is resolved server-side from
  a connection the viewer demonstrably has, so colleague emails never enter the
  page HTML and a caller cannot point this at an arbitrary address.
  ⚠ `contactEmail` — the ORIGINAL open compose form, which exists FOR
  off-platform contacts and must keep working.

  ⚠ SUPERSEDED, quoted not deleted (`E164`) — the single shape:

      const Body = z.object({
        contactName: z.string().trim().min(1, "Who are you asking?").max(120),
        contactEmail: z.string().trim().email("That doesn't look like an email address."),
        message: z.string().trim().min(20, "Add a line or two so they know why you're asking.").max(4000),
      });
*/
const Note = z
  .string()
  .trim()
  .min(20, "Add a line or two so they know why you're asking.")
  .max(4000);

const Body = z.union([
  z.object({ toUserId: z.string().uuid(), message: Note }),
  z.object({
    contactName: z.string().trim().min(1, "Who are you asking?").max(120),
    contactEmail: z.string().trim().email("That doesn't look like an email address."),
    message: Note,
  }),
]);

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form." },
      { status: 400 }
    );
  }

  try {
    const origin = request.headers.get("origin");
    const result =
      "toUserId" in parsed.data
        ? await requestRecommendationFromColleague(gate, parsed.data, { origin })
        : await requestRecommendation(gate, parsed.data, { origin });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof RecommendationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[recommendations] request failed:", e);
    return NextResponse.json(
      { error: "We couldn't send that just now. Please try again." },
      { status: 500 }
    );
  }
}
