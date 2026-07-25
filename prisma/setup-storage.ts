/**
 * Idempotent Supabase Storage setup — brief_O.
 *
 * Creates the public `profile-photos` bucket (5 MB cap, image mime types only)
 * if it doesn't already exist. Safe to re-run; documents the bucket config in
 * code so a fresh Supabase project can be brought up without clicking through
 * the dashboard. See deployment.md.
 *
 * Run with:  npm run storage:setup
 *
 * Loads .env.local itself — bare ts-node does not inherit it (see pitfalls.md).
 */
import { StorageClient } from "@supabase/storage-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const BUCKET = "profile-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME = ["image/png", "image/jpeg", "image/webp"];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local — nothing to do."
    );
    process.exitCode = 1;
    return;
  }

  // storage-js directly, not supabase-js `createClient` — that one always
  // starts a RealtimeClient, which throws on Node 20 (no WebSocket global).
  const storage = new StorageClient(`${url.replace(/\/+$/, "")}/storage/v1`, {
    apikey: key,
    Authorization: `Bearer ${key}`,
  });

  const { data: buckets, error: listErr } = await storage.listBuckets();
  if (listErr) throw listErr;

  const existing = buckets?.find((b) => b.name === BUCKET);
  if (existing) {
    console.log(`bucket "${BUCKET}" already exists (public: ${existing.public})`);
    // Keep the constraints in sync even if the bucket predates this script.
    const { error } = await storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: MIME,
    });
    if (error) throw error;
    console.log("bucket config reconciled ✓ (public, 5 MB, png/jpeg/webp)");
    return;
  }

  const { error } = await storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: MIME,
  });
  if (error) throw error;
  console.log(`created bucket "${BUCKET}" ✓ (public, 5 MB, png/jpeg/webp)`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
