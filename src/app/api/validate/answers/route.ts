import { NextResponse } from "next/server";
import { z } from "zod";
import { saveValidationAnswers } from "@/lib/project-validation";

const schema = z.object({
  token: z.string().min(1),
  responderName: z.string().max(200).nullish(),
  responderTitle: z.string().max(200).nullish(),
  workedFrom: z.string().max(40).nullish(),
  workedTo: z.string().max(40).nullish(),
  roleNote: z.string().max(600).nullish(),
  skillsNoted: z.array(z.string().max(200)).max(50).nullish(),
  wouldWorkAgain: z.enum(["YES", "MAYBE", "NO"]).nullish(),
  testimonial: z.string().max(4000).nullish(),
  testimonialPublic: z.boolean().optional(),
  attributionPublic: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { token, ...answers } = parsed.data;
  const result = await saveValidationAnswers(token, answers);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
