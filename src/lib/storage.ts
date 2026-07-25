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
