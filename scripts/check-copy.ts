import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// check:copy (company-v2 lane 5): American spelling in member-visible strings, Title Case on button labels.
// Status text inside a button (ends in …, or "✓ … — undo") stays a sentence (rule 11).
const BRITISH = /\b([Cc]olour|[Ff]avour|[Bb]ehaviour|[Oo]rganis(?:e|ed|es|ing|ation|ations|ational)|[Ll]icence|[Cc]entre|[Cc]atalogue)(s|ed|ing|ful|less|ite|ites)?\b/g;
// Allowed: the API still accepts the old stored ID value; the résumé parser must match British CVs.
const SPELLING_ALLOW = [/"Driving licence"/, /licences\?\|/];
const MINOR = new Set(["a", "an", "the", "and", "or", "nor", "but", "of", "to", "in", "on", "for", "at", "by", "from", "with", "as", "per", "via", "vs", "into", "onto"]);
const STATUS = /✓|undo|You're open|…|\.\.\.$/;

function walk(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e) && !/\.test\.ts$/.test(e)) out.push(p);
  }
  return out;
}

/** Blank out comments, keep strings and line numbers. */
function stripComments(s: string): string {
  let out = "";
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      out += c;
      if (c === "\\") { out += s[i + 1] ?? ""; i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { q = c; out += c; continue; }
    if (c === "/" && s[i + 1] === "/" && s[i - 1] !== ":") { const j = s.indexOf("\n", i); const e = j < 0 ? s.length : j; out += " ".repeat(e - i); i = e - 1; continue; }
    if (c === "/" && s[i + 1] === "*") { const j = s.indexOf("*/", i + 2); const e = j < 0 ? s.length : j + 2; out += s.slice(i, e).replace(/[^\n]/g, " "); i = e - 1; continue; }
    out += c;
  }
  return out;
}

/** `fragment`: part of a label built around an expression, so its edges aren't the label's first/last word. */
export function isTitleCase(t: string, fragment = false): boolean {
  const words = t.match(/\p{L}[\p{L}\p{N}'’-]*/gu) ?? [];
  return words.every((w, i) =>
    w.split("-").every((b, j, arr) => {
      if (!b) return true;
      const first = !fragment && i === 0 && j === 0;
      const last = !fragment && i === words.length - 1 && j === arr.length - 1;
      if (MINOR.has(b.toLowerCase()) && !first && !last) return true;
      return b[0] === b[0].toUpperCase();
    })
  );
}

const fails: string[] = [];
const BTN = /<(button|Link|a)\b((?:[^>{]|\{[^}]*\})*?)>([^<]*?)<\/\1>/g;
for (const f of walk("src")) {
  const raw = readFileSync(f, "utf8");
  const code = stripComments(raw);
  for (const m of code.matchAll(BRITISH)) {
    const lineText = code.split("\n")[code.slice(0, m.index).split("\n").length - 1];
    if (SPELLING_ALLOW.some((r) => r.test(lineText))) continue;
    fails.push(`${f}:${code.slice(0, m.index).split("\n").length} British spelling "${m[0]}"`);
  }
  if (!f.endsWith(".tsx")) continue;
  for (const m of code.matchAll(BTN)) {
    const [, tag, attrs, body0] = m;
    if (tag !== "button" && !/bg-ink\b|border-ink\b|bg-magenta\b/.test(attrs)) continue;
    const body = body0.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const exprs = (body.match(/\{[^}]*\}/g) ?? []).join("");
    const outside = body.replace(/\{[^}]*\}/g, "");
    const composed = !!exprs && /\S/.test(outside);
    const texts = [outside, ...[...exprs.matchAll(/(?:\?|:|\|\||&&|\{)\s*"([^"\n]{2,})"/g)].map((x) => x[1])];
    for (const t0 of texts) {
      const t = t0.replace(/&[a-z]+;/g, "'").trim();
      if (!t || STATUS.test(t) || !/[A-Za-z]/.test(t) || /[`()=]|\.\w+\(/.test(t)) continue;
      if (!isTitleCase(t, composed && t0 !== outside ? true : composed && /\{[^}]*\}\s*$/.test(body.trim()))) fails.push(`${f}:${code.slice(0, m.index).split("\n").length} button label not Title Case: "${t.slice(0, 60)}"`);
    }
  }
}

console.log(`check:copy — ${fails.length ? `${fails.length} problem(s)` : "American spelling, Title Case button labels"}`);
for (const x of fails.slice(0, 60)) console.log(`  ✗ ${x}`);
process.exit(fails.length ? 1 : 0);
