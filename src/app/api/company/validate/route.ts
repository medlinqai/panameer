import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { validateEntity } from "@/lib/company-validation";

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
