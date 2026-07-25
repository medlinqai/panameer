import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { importProfileDocument } from "@/lib/resume/import";
import { MAX_DOC_BYTES } from "@/lib/resume/extract";
import { getOnboardingState } from "@/lib/onboarding";

/**
 * POST /api/onboarding/provider/import — résumé / LinkedIn-PDF import
 * (brief_P / E012). multipart/form-data: `file`, plus `source` =
 * "RESUME" | "LINKEDIN_PDF".
 *
 * OWNER-SCOPED: the profile is resolved from the session, never from client
 * input — the same boundary as every other onboarding write.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { providerProfile: { select: { id: true } } },
  });
  const profileId = person?.providerProfile?.id;
  if (!profileId) {
    return NextResponse.json(
      { error: "No provider profile for this user" },
      { status: 404 }
    );
  }

  let file: File | null = null;
  let source: "RESUME" | "LINKEDIN_PDF" = "RESUME";
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
    if (form.get("source") === "LINKEDIN_PDF") source = "LINKEDIN_PDF";
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  if (file.size > MAX_DOC_BYTES) {
    return NextResponse.json(
      { error: "That file is larger than 5 MB. Please upload a smaller file." },
      { status: 413 }
    );
  }

  try {
    const result = await importProfileDocument({
      profileId,
      source,
      fileName: file.name,
      mimeType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });

    // A FAILED extraction is a real, reportable outcome (bad/scanned file) —
    // not a server error. 422 keeps it distinguishable from a 500.
    const status = result.status === "FAILED" ? 422 : 200;
    return NextResponse.json(
      { ...result, state: await getOnboardingState(viewer) },
      { status }
    );
  } catch (e) {
    console.error("[onboarding] résumé import failed:", e);
    return NextResponse.json(
      { error: "We couldn't import that file. Please try again." },
      { status: 500 }
    );
  }
}
