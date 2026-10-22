// TC-E002: Title Case guard (conventions.md › "UI copy — Title Case"; Scott 2026-08-30 / 2026-10-22).
// Scans static JSX text inside <button>, <Link>/<a>, <h1>–<h3>, title/label props on components, `label:` strings in
// arrays (tabs, steps, chips) and notification titles; fails on a lowercase principal word (or a lowercase first/last word).
// Usage: npx tsx scripts/check-title-case.ts [--since=2026-10-18] [files…]   Exit 1 when anything is flagged.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import ts from "typescript";

// Lowercase mid-phrase: articles, coordinating conjunctions, prepositions of four letters or fewer.
const MINOR = new Set(["a", "an", "the", "and", "but", "or", "nor", "for", "yet", "so", "at", "by", "from", "in", "of", "on", "to", "up", "with", "as", "via", "vs", "per", "into", "onto", "off", "out", "over"]);
// Deliberate exceptions: brand / product spellings and units.
const ALLOW = new Set(["iPhone", "iOS", "eBay", "e.g.", "i.e.", "etc.", "hr", "min", "h", "wk", "mo", "km", "x", "vs.", "csv", "pdf", "docx", "xlsx", "ics", "px"]);
const ALLOW_TEXT: RegExp[] = [/^\$/, /^https?:/, /@/];
const TAGS = new Set(["button", "Link", "a", "h1", "h2", "h3"]);
const PROP_NAMES = new Set(["title", "label", "eyebrow"]);

type Flag = { file: string; line: number; text: string; word: string };
type Edit = { start: number; end: number; text: string };

const decode = (t: string) => t.replace(/&amp;/g, "&").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&larr;/g, "←").replace(/&rarr;/g, "→").replace(/&nbsp;/g, " ").replace(/&middot;/g, "·");
const cap = (w: string) => w.replace(/^([^A-Za-z]*)([a-z])/, (_m, a: string, b: string) => a + b.toUpperCase());
/** Title-case one word given its place in the whole phrase. Hyphenated compounds capitalise both parts. */
function tcWord(w: string, first: boolean, last: boolean): string {
  const core = w.replace(/^[^A-Za-z]+|[^A-Za-z'’.-]+$/g, "");
  if (!core || !/^[a-z]/.test(core) || ALLOW.has(core) || /\d/.test(w) || /^['’]/.test(w)) return w;
  if (!first && !last && MINOR.has(core.toLowerCase())) return w;
  return w.split("-").map((part) => cap(part)).join("-");
}
/** Title-case text fragments that read as one phrase (fragments split by {expressions}). */
function tcFragments(frags: string[]): string[] {
  const all = frags.map((f) => f.split(/(\s+)/));
  // Each {expression} between fragments counts as a word, so a word next to it is never "first" or "last".
  const words: ({ fi: number; wi: number } | null)[] = [];
  all.forEach((parts, fi) => { if (fi > 0) words.push(null); parts.forEach((p, wi) => { if (p.trim()) words.push({ fi, wi }); }); });
  words.forEach((x, k) => { if (x) all[x.fi][x.wi] = tcWord(all[x.fi][x.wi], k === 0, k === words.length - 1); });
  return all.map((p) => p.join(""));
}

function badWord(text: string): string | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length > 70) return null;
  if (/^v\s|\sv\s|\sv$/.test(t)) return null; // version marker
  if (/[.!]$/.test(t) && !/\.\.\.$|…$/.test(t)) return null; // a sentence, not a title
  if (ALLOW_TEXT.some((re) => re.test(t))) return null;
  if (t === t.toUpperCase()) return null; // ALL-CAPS eyebrows
  const words = t.split(/[\s/]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    const w = raw.replace(/^[^A-Za-z]+|[^A-Za-z'’.-]+$/g, "");
    if (!w || !/^[a-z]/.test(w) || /^['’]/.test(raw)) continue;
    if (ALLOW.has(w) || ALLOW.has(raw)) continue;
    if (/\d/.test(raw)) continue;
    const edge = i === 0 || i === words.length - 1;
    if (!edge && MINOR.has(w.toLowerCase())) continue;
    if (edge && MINOR.has(w.toLowerCase()) && words.length === 1) return w;
    return w;
  }
  return null;
}

function scan(file: string, flags: Flag[], edits?: Edit[]) {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const add = (node: ts.Node, text: string, fix?: () => void) => {
    const w = badWord(decode(text));
    if (!w) return;
    flags.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: decode(text).replace(/\s+/g, " ").trim(), word: w });
    if (edits && fix) fix();
  };
  /** Replace a string literal / template part's inner text, keeping its quotes. */
  const fixLiteral = (n: ts.Node, inner: string, next: string) => {
    const raw = n.getText(sf);
    const at = raw.indexOf(inner);
    if (at >= 0 && inner !== next) edits!.push({ start: n.getStart() + at, end: n.getStart() + at + inner.length, text: next });
  };
  const tagName = (n: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => n.tagName.getText(sf);
  const visit = (node: ts.Node) => {
    // <button>…</button>, <Link>…</Link>, <h1>…: only the element's own static text (not nested elements).
    if (ts.isJsxElement(node) && TAGS.has(tagName(node.openingElement))) {
      // An inline link inside a sentence is body copy, not a control.
      const parent = node.parent;
      const inline = (ts.isJsxElement(parent) || ts.isJsxFragment(parent)) && parent.children.some((c) => ts.isJsxText(c) && /[A-Za-z]/.test(c.getText(sf)) && c !== (node as unknown));
      const texts = node.children.filter(ts.isJsxText);
      const allSimple = node.children.every((c) => ts.isJsxText(c) || ts.isJsxExpression(c));
      if (!inline && allSimple && texts.some((c) => c.getText(sf).trim())) {
        const phrase = node.children.map((c) => (ts.isJsxText(c) ? c.getText(sf) : " X ")).join("");
        add(node, phrase, () => {
          const fixed = tcFragments(texts.map((c) => c.getText(sf)));
          texts.forEach((c, k) => { if (c.getText(sf) !== fixed[k]) edits!.push({ start: c.getStart(), end: c.getEnd(), text: fixed[k] }); });
        });
      }
    }
    // title="…" / label="…" on components (Capitalized tags only — never HTML tooltips).
    // BlurredField's label is screen-reader text for hidden content, not a visible label.
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /^[A-Z]/.test(tagName(node)) && tagName(node) !== "BlurredField") {
      for (const a of node.attributes.properties) {
        if (ts.isJsxAttribute(a) && PROP_NAMES.has(a.name.getText(sf)) && a.initializer && ts.isStringLiteral(a.initializer)) { const lit = a.initializer; add(a, lit.text, () => fixLiteral(lit, lit.text, tcFragments([lit.text])[0])); }
      }
    }
    // { label: "…" } inside an array (tabs, steps, chips) and notification titles.
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      const key = node.name.text;
      const inArray = !!node.parent && ts.isObjectLiteralExpression(node.parent) && !!node.parent.parent && ts.isArrayLiteralExpression(node.parent.parent);
      if (key === "label" && inArray && ts.isStringLiteral(node.initializer)) { const lit = node.initializer; add(node, lit.text, () => fixLiteral(lit, lit.text, tcFragments([lit.text])[0])); }
      if (key === "title" && file.endsWith("notification-events.ts") && ts.isArrowFunction(node.initializer)) {
        const body = node.initializer.body;
        const text = ts.isStringLiteral(body) || ts.isNoSubstitutionTemplateLiteral(body) ? body.text : ts.isTemplateExpression(body) ? [body.head.text, ...body.templateSpans.map((s) => s.literal.text)].join(" X ") : "";
        if (text) add(node, text, () => {
          if (ts.isStringLiteral(body) || ts.isNoSubstitutionTemplateLiteral(body)) fixLiteral(body, body.text, tcFragments([body.text])[0]);
          else if (ts.isTemplateExpression(body)) {
            const parts = [body.head, ...body.templateSpans.map((s) => s.literal)];
            const fixed = tcFragments(parts.map((p) => p.text));
            parts.forEach((p, k) => fixLiteral(p, p.text, fixed[k]));
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function walk(dir: string, out: string[]) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(n) || n === "notification-events.ts") out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const since = args.find((a) => a.startsWith("--since="))?.slice(8);
let files = args.filter((a) => !a.startsWith("--"));
if (!files.length) {
  files = since
    ? execSync(`git log --since=${since} --name-only --format= -- src`, { encoding: "utf8" }).split("\n").filter((f) => /\.tsx$|notification-events\.ts$/.test(f))
    : walk("src", []);
  files = [...new Set(files)].filter((f) => { try { return statSync(f).isFile(); } catch { return false; } });
}
const flags: Flag[] = [];
const fix = args.includes("--fix");
let fixedFiles = 0;
for (const f of files) {
  const edits: Edit[] = [];
  scan(f, flags, fix ? edits : undefined);
  if (fix && edits.length) {
    let src = readFileSync(f, "utf8");
    for (const e of [...edits].sort((a, b) => b.start - a.start)) src = src.slice(0, e.start) + e.text + src.slice(e.end);
    writeFileSync(f, src);
    fixedFiles++;
  }
}
if (fix) console.log(`Fixed ${flags.length} label${flags.length === 1 ? "" : "s"} in ${fixedFiles} file${fixedFiles === 1 ? "" : "s"}.`);
for (const f of flags) console.log(`${f.file}:${f.line}  "${f.text}"  ← "${f.word}"`);
console.log(`\n${flags.length} Title Case flag${flags.length === 1 ? "" : "s"} in ${files.length} file${files.length === 1 ? "" : "s"}.`);
process.exit(flags.length ? 1 : 0);
