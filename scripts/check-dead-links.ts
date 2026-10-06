import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// check:dead-links (company-v2 lane 6): every internal href literal resolves to a page, route handler or redirect.
const APP = "src/app";

function walk(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. Routes from the file system: (groups) dropped, [x] = one segment, [...x] / [[...x]] = the rest.
const routes: RegExp[] = [];
for (const f of walk(APP)) {
  if (!/(^|\/)(page\.tsx|route\.ts|page\.ts)$/.test(f.split(sep).join("/"))) continue;
  const segs = relative(APP, f).split(sep).slice(0, -1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  const re = segs
    .map((s) => (/^\[\[?\.\.\./.test(s) ? "(?:/.*)?" : /^\[.*\]$/.test(s) ? "/[^/]+" : `/${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
    .join("");
  routes.push(new RegExp(`^${re || "/"}$`));
}
// Static files under public/.
const publicFiles = new Set(walk("public").map((f) => "/" + relative("public", f).split(sep).join("/")));
// 2. Redirect sources in next.config.ts (`:param` and `:param*`).
const cfg = readFileSync("next.config.ts", "utf8");
for (const m of cfg.matchAll(/source:\s*"([^"]+)"/g)) {
  const re = m[1].replace(/:[a-z]+\*/gi, ".*").replace(/:[a-z]+/gi, "[^/]+");
  routes.push(new RegExp(`^${re}$`));
}

const resolves = (href: string) => {
  const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  return publicFiles.has(path) || routes.some((r) => r.test(path));
};

// 3. href literals: href="/x", href={"/x"}, href: "/x", href={`/x/${id}`} (dynamic parts become one segment).
const dead: string[] = [];
let seen = 0;
for (const f of walk("src")) {
  if (!/\.tsx?$/.test(f) || /\.test\.ts$/.test(f)) continue;
  const s = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const found = [
    ...s.matchAll(/href=\{?"(\/[^"]*)"/g),
    ...s.matchAll(/\bhref:\s*"(\/[^"]*)"/g),
    ...[...s.matchAll(/href=\{`(\/[^`]*)`\}/g)].map((m) => [m[0], m[1].replace(/\$\{[^}]*\}/g, "x")] as unknown as RegExpMatchArray),
  ];
  for (const m of found) {
    const href = m[1];
    if (href.startsWith("//") || href.startsWith("/api/auth")) continue;
    seen++;
    if (!resolves(href)) dead.push(`${f}:${s.slice(0, (m as RegExpMatchArray).index ?? 0).split("\n").length} ${href}`);
  }
}

console.log(`check:dead-links — ${seen} internal hrefs, ${dead.length} dead`);
for (const d of dead) console.log(`  ✗ ${d}`);
process.exit(dead.length ? 1 : 0);
