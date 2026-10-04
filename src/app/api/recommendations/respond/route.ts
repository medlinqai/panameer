import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RecommendationError,
  declineRecommendation,
  submitRecommendation,
} from "@/lib/recommendations";

const Body = z.object({
  token: z.string().min(10),
  decline: z.boolean().optional(),
  body: z.string().trim().max(2000).optional(),
  title: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form." }, { status: 400 });
  }
  const { token, decline, body, title, company } = parsed.data;

  try {
    if (decline) {
      await declineRecommendation(token);
      return NextResponse.json({ ok: true, declined: true });
    }
    if (!body || body.length < 20) {
      return NextResponse.json(
        { error: "A recommendation needs at least a sentence or two." },
        { status: 400 }
      );
    }
    await submitRecommendation(token, {
      body,
      title,
      company,
      // Provenance only — never shown to the provider. It exists so a disputed
      // testimonial can be investigated.
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      ua: request.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RecommendationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[recommendations] respond failed:", e);
    return NextResponse.json(
      { error: "We couldn't record that. Please try again." },
      { status: 500 }
    );
  }
}
