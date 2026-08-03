/**
 * Idempotent Supabase Storage setup — brief_O.
 *
 * Creates the app's storage buckets if they don't already exist, and reconciles
 * their config if they do. Safe to re-run; documents the bucket setup in code
 * so a fresh Supabase project can be brought up without clicking through the
 * dashboard. See deployment.md.
 *
 * Run with:  npm run storage:setup
 *
 * Loads .env.local itself — bare ts-node does not inherit it (see pitfalls.md).
 */
import { StorageClient } from "@supabase/storage-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Buckets the app needs.
 *
 * `profile-photos` is PUBLIC — avatars render on public marketplace profiles.
 * `resumes` is PRIVATE (brief_Q): a résumé carries a home address, phone number
 * and employment history, so it is readable only via the service-role key on
 * the server, or a short-lived signed URL.
 */
const BUCKETS: {
  name: string;
  public: boolean;
  mime: string[];
}[] = [
  {
    name: "profile-photos",
    public: true,
    mime: ["image/png", "image/jpeg", "image/webp"],
  },
  {
    // Company logos (brief_j14 WS-D / E168). Public for the same reason photos
    // are — they render on pages anyone can see.
    name: "company-logos",
    public: true,
    mime: ["image/png", "image/jpeg", "image/webp"],
  },
  {
    name: "certifications",
    public: false,
    mime: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ],
  },
  {
    // PJv2 WS4 (E078a) — work artifacts attached to a job or a project.
    name: "artifacts",
    public: false,
    mime: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/webp",
    ],
  },
  {
    // brief_project_model_v2 — SOWs / case studies attached to a project.
    name: "project-docs",
    public: false,
    mime: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/webp",
    ],
  },
  {
    name: "resumes",
    public: false,
    mime: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/rtf",
      "text/rtf",
      "text/plain",
    ],
  },
];

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

  for (const spec of BUCKETS) {
    const opts = {
      public: spec.public,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: spec.mime,
    };
    const existing = buckets?.find((b) => b.name === spec.name);
    const visibility = spec.public ? "public" : "PRIVATE";

    if (existing) {
      // Keep the constraints in sync even if the bucket predates this script.
      const { error } = await storage.updateBucket(spec.name, opts);
      if (error) throw error;
      console.log(`bucket "${spec.name}" reconciled ✓ (${visibility}, 5 MB)`);
    } else {
      const { error } = await storage.createBucket(spec.name, opts);
      if (error) throw error;
      console.log(`created bucket "${spec.name}" ✓ (${visibility}, 5 MB)`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
