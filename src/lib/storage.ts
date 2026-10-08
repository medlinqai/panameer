import { StorageClient } from "@supabase/storage-js";
import { randomUUID } from "crypto";

/** Supabase Storage — profile photos (brief_O). */

/** Public bucket holding provider/person profile photos. See deployment.md. */
export const PROFILE_PHOTO_BUCKET = "profile-photos";

/** PUBLIC bucket holding COMPANY LOGOS (brief_j14 WS-D / E168). */
export const COMPANY_LOGO_BUCKET = "company-logos";

/** PRIVATE bucket holding uploaded résumés (brief_Q). */
export const RESUME_BUCKET = "resumes";

/** PRIVATE bucket for uploaded certificates (brief_U / E044). Private for the */
export const CERTIFICATION_BUCKET = "certifications";

/** PRIVATE bucket for project supporting documents (brief_project_model_v2). */
export const PROJECT_DOC_BUCKET = "project-docs";

/** PRIVATE bucket for work ARTIFACTS (PJv2 WS4 / E078a) — the deliverables a */
export const ARTIFACT_BUCKET = "artifacts";

/** PRIVATE bucket for BUG-REPORT SCREENSHOTS WS-3). */
export const SUPPORT_SCREENSHOT_BUCKET = "support-screenshots";

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
  "image/svg+xml": "svg",
};

/** Company logos also take SVG (shown only through <img>, so no script runs). */
export const ALLOWED_LOGO_MIME = [...ALLOWED_PHOTO_MIME, "image/svg+xml"] as const;

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

/** Validate + upload one profile photo, returning its public URL. */
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

/** Validate + upload one company logo, returning its public URL. */
export async function uploadCompanyLogo(
  companyId: string,
  file: { type: string; size: number; bytes: ArrayBuffer }
): Promise<string> {
  if (!ALLOWED_LOGO_MIME.includes(file.type as (typeof ALLOWED_LOGO_MIME)[number])) {
    throw new StorageError(
      "That file type isn't supported. Upload a PNG, JPG, WebP or SVG image.",
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

/** Store an uploaded résumé and return its OBJECT PATH */
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

/** Remove a résumé object from the private bucket WS-7). */
export async function deleteResumeFile(objectPath: string): Promise<boolean> {
  if (!objectPath.trim()) return true;
  try {
    const { error } = await getStorageClient()
      .from(RESUME_BUCKET)
      .remove([objectPath]);
    if (error) {
      console.error("[storage] résumé delete failed:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[storage] résumé delete threw:", e);
    return false;
  }
}

/** Store a certificate file; returns its object PATH (the bucket is private). */
/** THE FOLDER IS THE OWNER'S USER ID SINCE — a credential belongs */
export async function uploadCertificationFile(
  ownerId: string,
  file: { name: string; type: string; bytes: ArrayBuffer }
): Promise<string> {
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "certificate";
  const objectPath = `${ownerId}/${randomUUID()}-${safeName}`;

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

/** A short-lived signed URL for a stored résumé. The bucket is private, so this */
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


/** Store a bug-report screenshot and return its OBJECT PATH — not a URL, because */
export async function uploadSupportScreenshot(
  ticketId: string,
  file: { name: string; type: string; size: number; bytes: ArrayBuffer }
): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new StorageError("That image is too large (5MB max).", "TOO_LARGE");
  }
  const safeName =
    file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80) || "screenshot";
  const objectPath = `${ticketId}/${randomUUID()}-${safeName}`;

  const { error } = await getStorageClient()
    .from(SUPPORT_SCREENSHOT_BUCKET)
    .upload(objectPath, file.bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[storage] support screenshot upload failed:", error);
    throw new StorageError("Could not store that screenshot.", "UPLOAD_FAILED");
  }
  return objectPath;
}

/** A short-lived signed URL for a bug-report screenshot. The bucket is private */
export async function signedSupportScreenshotUrl(
  objectPath: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data, error } = await getStorageClient()
    .from(SUPPORT_SCREENSHOT_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    console.error("[storage] signed screenshot URL failed:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** PRIVATE bucket for images sent in messages; read back through a signed URL after a party check. */
export const MESSAGE_IMAGE_BUCKET = "message-images";

/** Store a message image (PNG/JPG/WebP, ≤5 MB) under the sender; returns the object path. Creates the bucket on first use. */
export async function uploadMessageImage(senderUserId: string, file: { type: string; size: number; bytes: ArrayBuffer }): Promise<string> {
  if (!(ALLOWED_PHOTO_MIME as readonly string[]).includes(file.type)) throw new StorageError("Images must be PNG, JPG or WebP.", "INVALID_TYPE");
  if (file.size > MAX_PHOTO_BYTES) throw new StorageError("That image is too large (5MB max).", "TOO_LARGE");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${senderUserId}/${randomUUID()}.${ext}`;
  const client = getStorageClient();
  const put = () => client.from(MESSAGE_IMAGE_BUCKET).upload(objectPath, file.bytes, { contentType: file.type, upsert: false });
  let { error } = await put();
  if (error && /not.?found/i.test(error.message)) {
    await client.createBucket(MESSAGE_IMAGE_BUCKET, { public: false, fileSizeLimit: MAX_PHOTO_BYTES, allowedMimeTypes: [...ALLOWED_PHOTO_MIME] });
    ({ error } = await put());
  }
  if (error) {
    console.error("[storage] message image upload failed:", error);
    throw new StorageError("Could not store that image.", "UPLOAD_FAILED");
  }
  return objectPath;
}

export async function signedMessageImageUrl(objectPath: string, expiresInSeconds = 300): Promise<string | null> {
  const { data, error } = await getStorageClient().from(MESSAGE_IMAGE_BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    console.error("[storage] signed message image URL failed:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}
