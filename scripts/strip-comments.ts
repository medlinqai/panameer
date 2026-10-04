/* Removes comment essays from src and scripts. Token stream must be identical. */
import ts from "typescript";
import { readFileSync, writeFileSync } from "fs";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const KEEP = /eslint-disable|eslint-enable|@ts-|prettier-ignore|^\/\/\/ <reference/;
const ESSAY = /⚠|Scott|SUPERSEDED|\bE\d{3}\b|ruling/i;
/* Gates whose own string literals contain comment markers; the scanner mis-ranges them. */
const SKIP = new Set(["scripts/check-comment-quotes.ts"]);

function files(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === ".next" || e === ".harness") continue;
      files(p, out);
    } else if (/\.tsx?$/.test(e) && !SKIP.has(p)) out.push(p);
  }
  return out;
}

/** The non-comment, non-trivia token stream — what must not change. */
function tokens(src: string, file: string): string[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, src);
  let kind = scanner.scan();
  while (kind !== ts.SyntaxKind.EndOfFileToken) {
    if (
      kind !== ts.SyntaxKind.SingleLineCommentTrivia &&
      kind !== ts.SyntaxKind.MultiLineCommentTrivia &&
      kind !== ts.SyntaxKind.WhitespaceTrivia &&
      kind !== ts.SyntaxKind.NewLineTrivia
    ) {
      out.push(`${kind}:${scanner.getTokenText()}`);
    }
    kind = scanner.scan();
  }
  void sf;
  return out;
}

/** Comment ranges to delete, found with the scanner rather than a regex. */
function doomedRanges(src: string): { pos: number; end: number }[] {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, src);
  const doomed: { pos: number; end: number }[] = [];
  let kind = scanner.scan();
  while (kind !== ts.SyntaxKind.EndOfFileToken) {
    if (
      kind === ts.SyntaxKind.SingleLineCommentTrivia ||
      kind === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const pos = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const text = src.slice(pos, end);
      const lines = text.split("\n").length;
      const keep = KEEP.test(text);
      const essay = ESSAY.test(text);
      const tooLong = text.length > 100;
      if (!keep && (lines >= 2 || essay || tooLong)) doomed.push({ pos, end });
    }
    kind = scanner.scan();
  }
  return doomed;
}

function strip(src: string): string {
  const doomed = doomedRanges(src);
  if (doomed.length === 0) return src;
  let out = "";
  let last = 0;
  for (const r of doomed) {
    out += src.slice(last, r.pos);
    last = r.end;
    /* Swallow the rest of the line when nothing else is on it. */
    const lineStart = out.lastIndexOf("\n") + 1;
    const before = out.slice(lineStart);
    const afterNl = src.indexOf("\n", last);
    const after = afterNl === -1 ? src.slice(last) : src.slice(last, afterNl);
    if (before.trim() === "" && after.trim() === "" && afterNl !== -1) {
      out = out.slice(0, lineStart);
      last = afterNl + 1;
    }
  }
  out += src.slice(last);
  return out.replace(/\n{3,}/g, "\n\n");
}

let changed = 0;
let before = 0;
let after = 0;
const failures: string[] = [];
for (const f of [...files("src"), ...files("scripts")]) {
  const src = readFileSync(f, "utf8");
  const next = strip(src);
  if (next === src) continue;
  const a = tokens(src, f);
  const b = tokens(next, f);
  if (a.length !== b.length || a.join("\u0000") !== b.join("\u0000")) {
    failures.push(f);
    continue;
  }
  before += src.split("\n").length;
  after += next.split("\n").length;
  writeFileSync(f, next);
  changed += 1;
}
console.log(`files changed: ${changed}`);
console.log(`lines: ${before} -> ${after} (${before - after} removed)`);
if (failures.length) {
  console.log(`SKIPPED (token mismatch, left untouched): ${failures.length}`);
  for (const f of failures.slice(0, 10)) console.log(`  ${f}`);
}
