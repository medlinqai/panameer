// BK-E001..E003: one-command backup of what GitHub doesn't hold — the database and the uploaded files.
// Read-only against live data: pg_dump + storage downloads; nothing is written to the database or storage.
//   npm run backup                      → ~/Panameer Backups/<YYYY-MM-DD_HHMM>/ (database.sql, storage/, manifest.json, RESTORE.md)
//   npm run backup -- --out <folder>    → somewhere else
//   npm run backup -- --encrypt         → one AES-256 archive (passphrase typed at the prompt, never stored), folder removed
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import readline from "node:readline";
import pg from "pg";
import { StorageClient } from "@supabase/storage-js";

const args = process.argv.slice(2);
const ENCRYPT = args.includes("--encrypt");
const outArg = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const ROOT = path.resolve(outArg ?? path.join(homedir(), "Panameer Backups"));
const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const STAMP = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const DIR = path.join(ROOT, STAMP);
const problems = [];
const log = (m) => console.log(m);

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const supaUrl = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dbUrl || !supaUrl || !supaKey) {
  console.error("Missing DIRECT_URL/DATABASE_URL, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run via `npm run backup` (loads .env.local).");
  process.exit(2);
}

const sha256File = (file) => new Promise((resolve, reject) => {
  const h = createHash("sha256");
  createReadStream(file).on("data", (d) => h.update(d)).on("end", () => resolve(h.digest("hex"))).on("error", reject);
});

/** A pg_dump whose major version is at least the server's: on PATH, else the official client cached in a temp folder (nothing installed). */
function findPgDump(serverMajor, serverVersion) {
  const ok = (bin) => {
    const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
    const m = /(\d+)\.\d+/.exec(r.stdout ?? "");
    return r.status === 0 && m && Number(m[1]) >= serverMajor;
  };
  if (ok("pg_dump")) return "pg_dump";
  const cache = path.join(tmpdir(), `panameer-pgclient-${serverVersion}`);
  const bin = path.join(cache, "pgsql", "bin", "pg_dump");
  if (existsSync(bin) && ok(bin)) return bin;
  if (process.platform !== "darwin") throw new Error(`Install a PostgreSQL ${serverMajor} client (pg_dump) and re-run.`);
  mkdirSync(cache, { recursive: true });
  const zip = path.join(cache, "pg.zip");
  for (const build of ["1", "2"]) {
    const url = `https://get.enterprisedb.com/postgresql/postgresql-${serverVersion}-${build}-osx-binaries.zip`;
    log(`Downloading the official PostgreSQL ${serverVersion} client into ${cache} (temp folder; nothing installed)…`);
    if (spawnSync("curl", ["-sfL", "-o", zip, url], { stdio: "inherit" }).status === 0) break;
  }
  execFileSync("unzip", ["-q", "-o", zip, "pgsql/bin/pg_dump", "pgsql/lib/*", "-d", cache]);
  rmSync(zip, { force: true });
  if (!ok(bin)) throw new Error("Could not get a pg_dump client");
  return bin;
}

async function database(client) {
  const ver = (await client.query("show server_version")).rows[0].server_version.split(" ")[0];
  const pgDump = findPgDump(Number(ver.split(".")[0]), ver);
  const u = new URL(dbUrl);
  const password = decodeURIComponent(u.password);
  u.password = "";
  const file = path.join(DIR, "database.sql");
  log("Dumping the database…");
  const r = spawnSync(pgDump, ["--no-owner", "--no-privileges", "-f", file, u.toString()], { env: { ...process.env, PGPASSWORD: password }, encoding: "utf8" });
  if (r.status !== 0) problems.push(`pg_dump failed: ${(r.stderr || "").split("\n")[0]}`);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (!text.includes("PostgreSQL database dump complete")) problems.push("database.sql has no \"dump complete\" marker");
  const tables = (await client.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")).rows.map((r) => r.table_name);
  const rowCounts = {};
  for (const t of tables) rowCounts[t] = Number((await client.query(`select count(*)::bigint n from "public"."${t}"`)).rows[0].n);
  const copies = (text.match(/^COPY public\./gm) ?? []).length;
  if (copies < tables.length) problems.push(`database.sql has ${copies} table data blocks for ${tables.length} tables`);
  return { file: "database.sql", serverVersion: ver, pgDump: pgDump === "pg_dump" ? "pg_dump on PATH" : "official client (temp folder)", bytes: statSync(file).size, sha256: await sha256File(file), tableCount: tables.length, rowCounts };
}

async function storage(client) {
  // Storage only (no realtime client, so no WebSocket needed on Node 20).
  const store = new StorageClient(`${supaUrl.replace(/\/$/, "")}/storage/v1`, { apikey: supaKey, Authorization: `Bearer ${supaKey}` });
  const supa = { storage: store };
  const { data: buckets, error } = await store.listBuckets();
  if (error) throw new Error(`Storage: ${error.message}`);
  // Cross-check: what storage itself says it holds (read-only query).
  const expected = new Map();
  try {
    for (const r of (await client.query("select bucket_id, count(*)::int n from storage.objects group by bucket_id")).rows) expected.set(r.bucket_id, r.n);
  } catch {
    problems.push("could not read storage.objects for the count check");
  }
  const files = [];
  const perBucket = {};
  for (const b of buckets) {
    let objects = 0, bytes = 0;
    const walk = async (prefix) => {
      for (let offset = 0; ; offset += 1000) {
        const { data, error: e } = await supa.storage.from(b.name).list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
        if (e) { problems.push(`${b.name}/${prefix}: ${e.message}`); return; }
        for (const item of data) {
          const p = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.id === null) { await walk(p); continue; }
          const { data: blob, error: de } = await supa.storage.from(b.name).download(p);
          if (de || !blob) { problems.push(`download failed: ${b.name}/${p}`); continue; }
          const buf = Buffer.from(await blob.arrayBuffer());
          const dest = path.join(DIR, "storage", b.name, p);
          mkdirSync(path.dirname(dest), { recursive: true });
          writeFileSync(dest, buf);
          files.push({ path: `storage/${b.name}/${p}`, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") });
          objects++; bytes += buf.length;
        }
        if (data.length < 1000) return;
      }
    };
    log(`Downloading bucket ${b.name}…`);
    await walk("");
    perBucket[b.name] = { public: b.public, objects, bytes, expected: expected.get(b.name) ?? 0 };
    if (expected.has(b.name) && expected.get(b.name) !== objects) problems.push(`${b.name}: ${objects} downloaded, storage says ${expected.get(b.name)}`);
  }
  return { buckets: perBucket, files };
}

/** BK-E003: names of the environment variables the app reads — names only, never values. */
function envNames() {
  const names = new Set();
  const scan = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!["node_modules", ".next", "out"].includes(e.name)) scan(p); continue; }
      if (!/\.(ts|tsx|mjs|js)$/.test(e.name)) continue;
      for (const m of readFileSync(p, "utf8").matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]+)|\[["']([A-Z][A-Z0-9_]+)["']\])/g)) names.add(m[1] ?? m[2]);
    }
  };
  for (const d of ["src", "prisma"]) if (existsSync(d)) scan(d);
  for (const f of ["next.config.ts", "next.config.js", "prisma.config.ts", "middleware.ts"]) if (existsSync(f)) for (const m of readFileSync(f, "utf8").matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) names.add(m[1]);
  return [...names].sort();
}

const RESTORE = (encrypted) => `# Restore a Panameer backup

${encrypted ? `## 0 · Decrypt (passphrase from your password manager)
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in ${STAMP}.tar.gz.enc -out ${STAMP}.tar.gz
    tar -xzf ${STAMP}.tar.gz          # → ${STAMP}/ with database.sql, storage/, manifest.json

` : ""}## 1 · Database
\`database.sql\` is a plain pg_dump of the whole database (server version in manifest.json › database.serverVersion), without owners or grants.
- Into a new, empty Supabase project: \`psql "<new DIRECT_URL>" -f database.sql\`. Errors about Supabase's own schemas
  (auth, storage, extensions) already existing are expected; the \`public\` tables and their rows are what matter.
- Check: row counts per table should match \`manifest.json › database.rowCounts\`.

## 2 · Uploaded files
\`storage/<bucket>/…\` holds every object at its original path. \`manifest.json › storage.buckets\` lists each bucket and whether it is public.
1. Create each bucket in the new project with the same name and public/private setting.
2. Upload every file back to the same path, e.g. with Node in the app folder (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY of the NEW project):
       node -e 'const {createClient}=require("@supabase/supabase-js");const fs=require("fs"),p=require("path");const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const root="storage";(async()=>{for(const b of fs.readdirSync(root)){const walk=async d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())await walk(f);else{const key=p.relative(p.join(root,b),f);const r=await s.storage.from(b).upload(key,fs.readFileSync(f),{upsert:true});console.log(r.error?"FAIL":"ok",b,key)}}};await walk(p.join(root,b))}})()'
3. Check: object counts per bucket should match the manifest; every file's SHA-256 is listed there too.

## 3 · Settings
Environment variables are NOT in the backup. \`manifest.json › envNames\` lists the names the app reads; the values are in your password manager.
`;

async function prompt(q) {
  if (!process.stdin.isTTY) {
    // Scripted use: two lines on stdin (passphrase, confirmation). Never echoed or stored.
    const rl = readline.createInterface({ input: process.stdin });
    const it = rl[Symbol.asyncIterator]();
    const a = (await it.next()).value ?? "", b = (await it.next()).value ?? "";
    rl.close();
    return [a, b];
  }
  const ask = (label) => new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(label)) rl.output.write(s); };
    rl.question(label, (v) => { rl.close(); process.stdout.write("\n"); resolve(v); });
  });
  return [await ask(q), await ask("Type it again: ")];
}

function openssl(argsList, passphrase, outFile) {
  return new Promise((resolve, reject) => {
    const p = spawn("openssl", argsList, { stdio: ["pipe", outFile ? "ignore" : "pipe", "pipe"] });
    const h = createHash("sha256");
    if (!outFile) p.stdout.on("data", (d) => h.update(d));
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve(h.digest("hex")) : reject(new Error(err.split("\n")[0] || `openssl exited ${code}`))));
    p.stdin.end(`${passphrase}\n`);
  });
}

async function encrypt() {
  const tgz = path.join(ROOT, `${STAMP}.tar.gz`);
  const enc = `${tgz}.enc`;
  execFileSync("tar", ["-czf", tgz, "-C", ROOT, STAMP]);
  const [p1, p2] = await prompt("Backup passphrase (not stored — keep it in your password manager): ");
  if (!p1 || p1.length < 8) throw new Error("Passphrase must be at least 8 characters");
  if (p1 !== p2) throw new Error("The two passphrases don't match");
  const common = ["-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "stdin"];
  await openssl(["enc", ...common, "-salt", "-in", tgz, "-out", enc], p1, enc);
  const back = await openssl(["enc", "-d", ...common, "-in", enc], p1, null);
  if (back !== (await sha256File(tgz))) throw new Error("The archive did not decrypt to the same bytes — the unencrypted folder is kept");
  writeFileSync(path.join(ROOT, `${STAMP}_RESTORE.md`), RESTORE(true));
  rmSync(DIR, { recursive: true, force: true });
  rmSync(tgz, { force: true });
  return { file: enc, bytes: statSync(enc).size };
}

const folderBytes = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? folderBytes(path.join(d, e.name)) : statSync(path.join(d, e.name)).size), 0);
const human = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`);

async function main() {
  mkdirSync(DIR, { recursive: true });
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    const db = await database(client);
    const st = await storage(client);
    let commit = "unknown";
    try { commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
    const manifest = {
      createdAt: now.toISOString(), gitCommit: commit, folder: STAMP, complete: problems.length === 0, problems,
      database: db, storage: { buckets: st.buckets, objectCount: st.files.length, bytes: st.files.reduce((n, f) => n + f.bytes, 0) },
      envNames: envNames(), files: st.files,
    };
    writeFileSync(path.join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(path.join(DIR, "RESTORE.md"), RESTORE(false));
    const size = folderBytes(DIR);
    log(`\nBackup ${problems.length ? "INCOMPLETE" : "complete"}: ${DIR}`);
    log(`  database: ${db.tableCount} tables, ${Object.values(db.rowCounts).reduce((a, b) => a + b, 0)} rows, ${human(db.bytes)}`);
    log(`  storage:  ${Object.entries(st.buckets).map(([b, v]) => `${b} ${v.objects}`).join(" · ")} — ${st.files.length} files, ${human(manifest.storage.bytes)}`);
    log(`  env names: ${manifest.envNames.length} (names only)  ·  folder ${human(size)}`);
    for (const p of problems) log(`  ✗ ${p}`);
    if (problems.length) process.exitCode = 1;
    else if (ENCRYPT) {
      const a = await encrypt();
      log(`  encrypted → ${a.file} (${human(a.bytes)}); unencrypted folder removed; RESTORE beside it`);
    } else if (st.buckets.resumes?.objects) {
      log("  ⚠ This folder holds résumés unencrypted. Prefer: npm run backup -- --encrypt");
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(`Backup failed: ${e.message}`); process.exitCode = 1; });
