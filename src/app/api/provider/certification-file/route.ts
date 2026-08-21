import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { uploadCertificationFile, StorageError } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/**
 * POST /api/provider/certification-file — store a certificate (brief_U / E044).
 *
 * OWNER-SCOPED: the owner comes from the session, so the object always lands in
 * the caller's own folder in the PRIVATE `certifications` bucket. Returns the
 * object path, which the certification row then references.
 *
 * ── ⚠ THE FOLDER IS THE **USER**, NOT THE PROVIDER PROFILE (`P1-J3-E019`) ────
 *
 * A credential belongs to the person now, so its attachment does too. Keying the
 * folder on the profile meant an object whose owning row could outlive the folder
 * it was filed under — `Certification.provider_profile_id` is nullable and its FK
 * is `SetNull`, so deleting a profile keeps the credential and would have left its
 * file under a directory named after something that no longer exists.
 *
 * ⚠ EXISTING OBJECTS ARE NOT MOVED. They stay where they were written and their
 * stored `attachment_path` still points at them; only new uploads use the new
 * folder. Rewriting object paths in a private bucket to tidy a convention is a
 * migration, not a side effect of this brief.
 *
 * ── ⚠ TWO THINGS THIS BRIEF'S WS3 ASSUMES THAT DO NOT EXIST ─────────────────
 *
 * 1. THERE IS NO READ PATH. Nothing in the repo serves a certification
 *    attachment — this file is POST-only, `signedResumeUrl` is for résumés, and
 *    `attachment_path` is only ever written and echoed back through onboarding.
 *    So "fetch another user's attachment must 403" has no endpoint to fire
 *    against. Reported rather than papered over with a route nobody asked for.
 * 2. A LEARNER HAS NOTHING TO ATTACH. A `LEARN` credential is ISSUED by Panameer
 *    with a verify URL; there is no scan to upload. The attachment belongs to the
 *    `SELF_REPORTED` flow, which is a seller typing in a certificate they hold.
 *
 * ⚠ SO THE CAPABILITY GATE IS LEFT AS `canProvideServices` RATHER THAN WIDENED.
 * Loosening it to `authenticated` would open an upload surface for a case that
 * cannot occur, which is a real cost for no gain. If a learner ever needs to
 * attach something, that is the change — and it should be a decision, not a
 * side effect of renaming a folder.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;


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
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 5 MB." }, { status: 413 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Attach a PDF or an image." }, { status: 400 });
  }

  try {
    /* ⚠ THE SESSION'S USER, never a value from the request. */
    const path = await uploadCertificationFile(gate.userId, {
      name: file.name,
      type: file.type,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json({ ok: true, path, name: file.name });
  } catch (e) {
    if (e instanceof StorageError) {
      const status = e.code === "NOT_CONFIGURED" ? 503 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[certification-file] upload failed:", e);
    return NextResponse.json({ error: "Could not upload." }, { status: 500 });
  }
}
