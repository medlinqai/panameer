import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { applyProviderSection } from "@/lib/onboarding";
import {
  uploadProfilePhoto,
  StorageError,
  MAX_PHOTO_BYTES,
} from "@/lib/storage";

/**
 * POST /api/profile/photo — upload the SIGNED-IN person's profile photo
 * (brief_O). multipart/form-data with one `file` field.
 *
 * OWNER-SCOPED by construction: the target Person is resolved from the session
 * (`user_id: viewer.userId`), never from client input, so there is no way to
 * write a photo onto someone else's record. Mirrors the onboarding ownership
 * boundary. Validation (mime + ≤5 MB) lives in `storage.ts`.
 *
 * Used by BOTH the onboarding "Add a Photo" step and Settings → Profile.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true, providerProfile: { select: { id: true } } },
  });
  if (!person) {
    return NextResponse.json({ error: "No profile for this user" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  // Cheap pre-check before buffering the body into memory.
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "That image is larger than 5 MB. Choose a smaller file." },
      { status: 413 }
    );
  }

  try {
    const photoUrl = await uploadProfilePhoto(person.id, {
      type: file.type,
      size: file.size,
      bytes: await file.arrayBuffer(),
    });

    // Persist through the shared section writer so `completeness` (which counts
    // the photo) is recomputed exactly the way every other save does it.
    if (person.providerProfile) {
      await applyProviderSection(
        person.providerProfile.id,
        person.id,
        "photo",
        { photoUrl }
      );
    } else {
      await prisma.person.update({
        where: { id: person.id },
        data: { photo_url: photoUrl },
      });
    }

    return NextResponse.json({ ok: true, photoUrl });
  } catch (e) {
    if (e instanceof StorageError) {
      const status =
        e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[profile] photo upload failed:", e);
    return NextResponse.json({ error: "Could not upload that image." }, { status: 500 });
  }
}

/** DELETE /api/profile/photo — clear the photo (back to the initials fallback). */
export async function DELETE() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true, providerProfile: { select: { id: true } } },
  });
  if (!person) {
    return NextResponse.json({ error: "No profile for this user" }, { status: 404 });
  }

  if (person.providerProfile) {
    await applyProviderSection(person.providerProfile.id, person.id, "photo", {
      photoUrl: null,
    });
  } else {
    await prisma.person.update({
      where: { id: person.id },
      data: { photo_url: null },
    });
  }
  return NextResponse.json({ ok: true, photoUrl: null });
}
