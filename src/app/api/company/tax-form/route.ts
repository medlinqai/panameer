import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { uploadCompanyTaxForm } from "@/lib/company-pay";
import { OnboardingError } from "@/lib/onboarding";
import { StorageError } from "@/lib/storage";

// Lifecycle step 5: an admin uploads the company's W-9 (US) or W-8BEN-E (outside the US).
export async function POST(request: Request) {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const entry = (await request.formData().catch(() => null))?.get("file");
  if (!(entry instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  try {
    return NextResponse.json(await uploadCompanyTaxForm(viewer, { name: entry.name, type: entry.type, size: entry.size, bytes: await entry.arrayBuffer() }));
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: e.code === "GATE_UNMET" ? 403 : 400 });
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: 503 });
    throw e;
  }
}
