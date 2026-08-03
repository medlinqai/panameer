import { StorageClient } from "@supabase/storage-js";
import { randomUUID } from "crypto";

/**
 * Supabase Storage — profile photos (brief_O).
 *
 * SERVER ONLY. Uses the service-role key, so this module must never be
 * imported into a client component.
 *
 * The client is constructed LAZILY (same pattern as the Resend client, see
 * pitfalls.md): building it at module load would throw when the Supabase env
 * vars are unset, which breaks `next build`'s page-data collection for every
 * route that transitively imports this file.
 *
 * Uses `@supabase/storage-js` directly rather than supabase-js's `createClient`
 * — the latter always spins up a RealtimeClient, which throws on Node 20
 * ("WebSocket is not available"). We only need Storage.
 */

/** Public bucket holding provider/person profile photos. See deployment.md. */
export const PROFILE_PHOTO_BUCKET = "profile-photos";

/**
 * PUBLIC bucket holding COMPANY LOGOS (brief_j14 WS-D / E168).
 *
 * Public for the same reason profile photos are: a logo is rendered on pages
 * anyone can see — a work request, a provider card — and signing every one of
 * them would add a round trip per image for a mark the company publishes
 * everywhere anyway.
 */
export const COMPANY_LOGO_BUCKET = "company-logos";

/**
 * PRIVATE bucket holding uploaded résumés (brief_Q).
 *
 * Deliberately NOT public, unlike profile photos: a résumé is personal data
 * (home address, phone, employment history). Objects are reachable only through
 * the service-role key on the server, and the app hands out short-lived signed
 * URLs when a file genuinely needs to be re-read.
 */
export const RESUME_BUCKET = "resumes";

/**
 * PRIVATE bucket for uploaded certificates (brief_U / E044). Private for the
 * same reason as résumés: a certificate carries a full legal name and a
 * credential number. Served only through short-lived signed URLs.
 */
export const CERTIFICATION_BUCKET = "certifications";

/**
 * PRIVATE bucket for project supporting documents (brief_project_model_v2).
 *
 * Private is the whole point: a statement of work or a case study carries the
 * client's name, scope and commercials — exactly the material a provider may
 * have marked `CONFIDENTIAL` on the project itself. Storing a public URL here
 * would leak around that setting, so this follows the certificate rule and
 * returns an object PATH, read back only through a short-lived signed URL.
 */
export const PROJECT_DOC_BUCKET = "project-docs";

/**
 * PRIVATE bucket for work ARTIFACTS (PJv2 WS4 / E078a) — the deliverables a
 * provider attaches to a job or a project as proof.
 *
 * Private for the same reason as project docs: an artifact is a design doc, a
 * runbook, a screenshot of a client's system. It is evidence shown deliberately,
 * not published, so this returns an object PATH read back through a short-lived
 * signed URL.
 */
export const ARTIFACT_BUCKET = "artifacts";

/** E012 — "PDF / Word / rich text, ≤5MB". */
export const ALLOWED_RESUME_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/rtf",
  "text/rtf",
  "text/plain",
] as const;

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** Accepted image types. Anything else is rejected with a clear error. */
export const ALLOWED_PHOTO_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Hard size cap — 5 MB. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class StorageError extends Error {
  constructor(
    message: string,
    public code: "NOT_CONFIGURED" | "INVALID_TYPE" | "TOO_LARGE" | "UPLOAD_FAILED"
  ) {
    super(message);
    this.name = "StorageError";
  }
}

let _client: StorageClient | null = null;

function getStorageClient(): StorageClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new StorageError(
      "Photo uploads aren't configured on this environment.",
      "NOT_CONFIGURED"
    );
  }
  _client = new StorageClient(`${url.replace(/\/+$/, "")}/storage/v1`, {
    apikey: key,
    Authorization: `Bearer ${key}`,
  });
  return _client;
}

/** Human-readable list for error copy. */
const allowedList = "PNG, JPG, or WebP";

/**
 * Validate + upload one profile photo, returning its public URL.
 *
 * `personId` is ALWAYS resolved server-side from the session — never accepted
 * from client input — so a caller can only ever write into their own folder.
 */
export async function uploadProfilePhoto(
  personId: string,
  file: { type: string; size: number; bytes: ArrayBuffer }
): Promise<string> {
  if (!ALLOWED_PHOTO_MIME.includes(file.type as (typeof ALLOWED_PHOTO_MIME)[number])) {
    throw new StorageError(
      `That file type isn't supported. Upload a ${allowedList} image.`,
      "INVALID_TYPE"
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new StorageError(
      "That image is larger than 5 MB. Choose a smaller file.",
      "TOO_LARGE"
    );
  }
  if (file.size === 0) {
    throw new StorageError("That file is empty.", "INVALID_TYPE");
  }

  // Folder-per-person + a random filename: a new upload never collides with,
  // and never needs to guess, the previous one.
  const objectPath = `${personId}/${randomUUID()}.${EXTENSION[file.type]}`;

  const bucket = getStorageClient().from(PROFILE_PHOTO_BUCKET);

  const { error } = await bucket.upload(objectPath, file.bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });

  if (error) {
    console.error("[storage] profile photo upload failed:", error);
    throw new StorageError("Could not upload that image.", "UPLOAD_FAILED");
  }

  const { data } = bucket.getPublicUrl(objectPath);
  return data.publicUrl;
}

/**
 * Validate + upload one company logo, returning its public URL.
 *
 * `companyId` is resolved server-side from the caller's ADMIN membership, never
 * from client input — the same ownership boundary as the profile photo, applied
 * to an entity rather than a person.
 */
export async function uploadCompanyLogo(
  companyId: string,
  file: { type: string; size: number; bytes: ArrayBuffer }
): Promise<string> {
  if (!ALLOWED_PHOTO_MIME.includes(file.type as (typeof ALLOWED_PHOTO_MIME)[number])) {
    throw new StorageError(
      `That file type isn't supported. Upload a ${allowedList} image.`,
      "INVALID_TYPE"
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new StorageError(
      "That image is larger than 5 MB. Choose a smaller file.",
      "TOO_LARGE"
    );
  }
  if (file.size === 0) {
    throw new StorageError("That file is empty.", "INVALID_TYPE");
  }

  const objectPath = `${companyId}/${randomUUID()}.${EXTENSION[file.type]}`;
  const bucket = getStorageClient().from(COMPANY_LOGO_BUCKET);
  const { error } = await bucket.upload(objectPath, file.bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    console.error("[storage] company logo upload failed:", error);
    throw new StorageError("Could not upload that image.", "UPLOAD_FAILED");
  }
  return bucket.getPublicUrl(objectPath).data.publicUrl;
}

/**
 * Store an uploaded résumé and return its OBJECT PATH
 * (brief_Q) — not a URL, because the bucket is private. Keeping the original
 * file means a parse can be re-run or audited without asking the user to
 * upload again, and the review page can offer the source document back.
 *
 * Storage failures are the CALLER's to tolerate: a lost file must never fail an
 * import whose parse already succeeded.
 */
export async function uploadResumeFile(
  profileId: string,
  file: { name: string; type: string; bytes: ArrayBuffer }
): Promise<string> {
  // Keep the user's filename (sanitised) so a support conversation can refer to
  // it, prefixed with a uuid so two "resume.pdf" uploads can't collide.
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "resume";
  const objectPath = `${profileId}/${randomUUID()}-${safeName}`;

  const { error } = await getStorageClient()
    .from(RESUME_BUCKET)
    .upload(objectPath, file.bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] résumé upload failed:", error);
    throw new StorageError("Could not store that file.", "UPLOAD_FAILED");
  }
  return objectPath;
}

/** Store a certificate file; returns its object PATH (the bucket is private). */
export async function uploadCertificationFile(
  profileId: string,
  file: { name: string; type: string; bytes: ArrayBuffer }
): Promise<string> {
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "certificate";
  const objectPath = `${profileId}/${randomUUID()}-${safeName}`;

  const { error } = await getStorageClient()
    .from(CERTIFICATION_BUCKET)
    .upload(objectPath, file.bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] certificate upload failed:", error);
    throw new StorageError("Could not store that file.", "UPLOAD_FAILED");
  }
  return objectPath;
}

/** Store a project document; returns its object PATH (the bucket is private). */
export async function uploadProjectDocument(
  profileId: string,
  file: { name: string; type: string; bytes: ArrayBuffer }
): Promise<string> {
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "document";
  const objectPath = `${profileId}/${randomUUID()}-${safeName}`;

  const { error } = await getStorageClient()
    .from(PROJECT_DOC_BUCKET)
    .upload(objectPath, file.bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] project document upload failed:", error);
    throw new StorageError("Could not store that file.", "UPLOAD_FAILED");
  }
  return objectPath;
}

/** Store an artifact file; returns its object PATH (the bucket is private). */
export async function uploadArtifactFile(
  profileId: string,
  file: { name: string; type: string; bytes: ArrayBuffer }
): Promise<string> {
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "artifact";
  const objectPath = `${profileId}/${randomUUID()}-${safeName}`;

  const { error } = await getStorageClient()
    .from(ARTIFACT_BUCKET)
    .upload(objectPath, file.bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] artifact upload failed:", error);
    throw new StorageError("Could not store that file.", "UPLOAD_FAILED");
  }
  return objectPath;
}

/**
 * A short-lived signed URL for a stored résumé. The bucket is private, so this
 * is the only way to read one back, and the link expires.
 */
export async function signedResumeUrl(
  objectPath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data, error } = await getStorageClient()
    .from(RESUME_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    console.error("[storage] signed résumé URL failed:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
