// L-E016: upload approved Beginners finals to Vimeo (tus) and attach them to their Oracle Cloud Foundations lessons.
// Resume-safe: a lesson that already has a video is skipped. Never writes to OneDrive (read/materialize only).
// Usage: npx tsx --env-file=.env.local scripts/beginners-upload.ts [--apply]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, openSync, readSync, closeSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { notifyOpenedPaths } from "@/lib/learn-watch";

const ROOT = path.join(homedir(), "Library/CloudStorage/OneDrive-Panameer/Panameer I/1. Content Creators/2. Panameer.com/1. Learn/1. Beginners");
const PATH_SLUG = "oracle-cloud-foundations";
// Approved at Phase 1: only files that match a lesson with no video yet (see scripts/out/beginners-phase1-2026-10-08.md).
const APPROVED = [
  { file: "4. Login & Get Started/1. What is Demo Services/3. Final/What is demo services.mp4", lesson: "What is Demo Services?" },
  { file: "4. Login & Get Started/2. Navigation/3. Final/How to Navigate Oracle Cloud .mp4", lesson: "How to Navigate Oracle Cloud" },
];
const LOG = "scripts/out/beginners-upload-2026-10-08.csv";
const API = "https://api.vimeo.com";
const TOKEN = process.env.VIMEO_ACCESS_TOKEN ?? "";
const H = { Authorization: `bearer ${TOKEN}`, Accept: "application/vnd.vimeo.*+json;version=3.4" };
const CHUNK = 64 * 1024 * 1024;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (file: string, vimeoId: string, lesson: string, status: string) => {
  if (!existsSync(LOG)) writeFileSync(LOG, "file,vimeo_id,lesson,status,at\n");
  appendFileSync(LOG, [file, vimeoId, lesson, status, new Date().toISOString()].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",") + "\n");
};

async function vimeo(pathOrUrl: string, init: RequestInit = {}) {
  const r = await fetch(pathOrUrl.startsWith("http") ? pathOrUrl : `${API}${pathOrUrl}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Vimeo ${r.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

/** Ask OneDrive to download the placeholder, then wait until every byte reads. */
async function materialize(abs: string) {
  try { execFileSync("fileproviderctl", ["materialize", abs], { stdio: "ignore", timeout: 60_000 }); } catch { /* reading below also triggers the download */ }
  const size = statSync(abs).size;
  for (let i = 0; i < 360; i++) {
    try {
      const fd = openSync(abs, "r");
      const buf = Buffer.alloc(1);
      const n = readSync(fd, buf, 0, 1, Math.max(0, size - 1));
      closeSync(fd);
      if (n === 1) return size;
    } catch { /* still downloading */ }
    await sleep(5000);
  }
  throw new Error("OneDrive did not finish downloading in 30 minutes");
}

async function tusUpload(abs: string, size: number, name: string, privacy: Record<string, unknown>) {
  const created = await vimeo("/me/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ upload: { approach: "tus", size }, name, privacy }) });
  const link: string = created.upload.upload_link;
  const fd = openSync(abs, "r");
  let offset = 0;
  try {
    while (offset < size) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      readSync(fd, buf, 0, len, offset);
      const r = await fetch(link, { method: "PATCH", headers: { "Tus-Resumable": "1.0.0", "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream" }, body: buf });
      if (!r.ok) throw new Error(`tus PATCH ${r.status}`);
      offset = Number(r.headers.get("upload-offset") ?? offset + len);
      process.stdout.write(`  ${Math.round((offset / size) * 100)}%\r`);
    }
  } finally {
    closeSync(fd);
  }
  return created as { uri: string; link: string };
}

(async () => {
  const apply = process.argv.includes("--apply");
  const verify = await vimeo("/oauth/verify");
  const scopes = String(verify.scope ?? "").split(" ");
  const canUpload = scopes.includes("upload");
  const ocf = await prisma.learningPath.findUnique({
    where: { slug: PATH_SLUG },
    select: { courses: { select: { sections: { select: { lessons: { select: { id: true, title: true, vimeo_ref: true } } } } } } },
  });
  const lessons = ocf!.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
  // Privacy as existing lesson videos: read one that is already attached.
  const sample = lessons.find((l) => l.vimeo_ref)?.vimeo_ref?.split("/")[0];
  const privacy = sample ? (await vimeo(`/videos/${sample}?fields=privacy`)).privacy : { view: "unlisted" };
  const want = { view: privacy.view, embed: privacy.embed, download: privacy.download ?? false, add: false, comments: "nobody" };
  let uploaded = 0;
  for (const a of APPROVED) {
    const lesson = lessons.find((l) => l.title === a.lesson);
    const abs = path.join(ROOT, a.file);
    if (!lesson) { log(a.file, "", a.lesson, "skipped: lesson not found"); continue; }
    if (lesson.vimeo_ref) { log(a.file, lesson.vimeo_ref, a.lesson, "skipped: lesson already has a video"); continue; }
    if (!existsSync(abs)) { log(a.file, "", a.lesson, "skipped: file not found"); continue; }
    if (!canUpload) { log(a.file, "", a.lesson, `blocked: token scope is "${verify.scope}" (needs upload + edit)`); continue; }
    if (!apply) { log(a.file, "", a.lesson, "dry run: would upload"); continue; }
    console.log(`→ ${a.lesson}`);
    const size = await materialize(abs);
    const v = await tusUpload(abs, size, a.lesson, want);
    const id = v.uri.split("/").pop()!;
    const hash = want.view === "unlisted" ? v.link.split("/").pop() : null;
    const ref = hash && hash !== id ? `${id}/${hash}` : id;
    let duration = 0;
    for (let i = 0; i < 120 && !duration; i++) {
      await sleep(10_000);
      duration = (await vimeo(`/videos/${id}?fields=duration`)).duration ?? 0;
    }
    await prisma.lesson.update({ where: { id: lesson.id }, data: { vimeo_ref: ref, production_status: "URL_ADDED_TO_LESSON", ...(duration ? { duration_seconds: duration, duration_source: "vimeo" } : {}) } });
    log(a.file, ref, a.lesson, duration ? "uploaded" : "uploaded (duration pending)");
    uploaded++;
  }
  if (uploaded) await notifyOpenedPaths();
  console.log(JSON.stringify({ canUpload, scope: verify.scope, approved: APPROVED.length, uploaded, log: LOG }));
  process.exit(0);
})();
