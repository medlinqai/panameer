import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Scott 2026-10-05: every button and button-styled link is a rectangle with square corners.
// Round stays only for: icon-only circles (equal h/w), avatars, switches, status dots, rings, badges.
// `--fix` rewrites violations in place (removes the rounding); without it this is the gate.
const FIX = process.argv.includes("--fix");
const ROUND = /(?<![\w-])(?:[a-z0-9]+:)*rounded(?:-(?:full|lg|xl|2xl|3xl|brand|md|sm|\[[^\]\s]+\]))?(?![\w-])/g;
const BUTTON_TAGS = /<(button|a|Link|Button|Btn)\b/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(f) && !/\.test\.ts$/.test(f)) out.push(p);
  }
  return out;
}

/** Icon-only circular control, avatar, switch: allowed to stay round. */
function roundAllowed(cls: string, tag: string): boolean {
  if (/role=["']switch["']|aria-checked|avatar/i.test(tag + cls)) return true;
  const h = /(?<![\w-])h-(\d+(?:\.\d+)?|\[[^\]]+\])(?![\w-])/.exec(cls)?.[1];
  const w = /(?<![\w-])w-(\d+(?:\.\d+)?|\[[^\]]+\])(?![\w-])/.exec(cls)?.[1];
  const size = /(?<![\w-])size-/.test(cls);
  return (!!h && h === w) || size;
}

/** End of a JSX opening tag starting at `i`, skipping braces and quotes. */
function tagEnd(s: string, i: number): number {
  let depth = 0;
  let q: string | null = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) {
      if (c === q && s[k - 1] !== "\\") q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return k;
  }
  return s.length;
}

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length)).replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

type Hit = { file: string; line: number; text: string };
const hits: Hit[] = [];
let files = 0;
const touched = new Set<string>();

for (const file of walk("src")) {
  let src = readFileSync(file, "utf8");
  const code = strip(src);
  const edits: [number, number, string][] = [];
  const flag = (start: number, end: number) => {
    const seg = src.slice(start, end);
    if (!ROUND.test(seg)) return;
    ROUND.lastIndex = 0;
    hits.push({ file, line: src.slice(0, start).split("\n").length, text: seg.replace(/\s+/g, " ").slice(0, 110) });
    // Remove the token with ONE neighbouring space, so edge spaces used in "a " + "b" concatenation survive.
    const R = ROUND.source;
    edits.push([start, end, seg.replace(new RegExp(` ${R}|${R} |${R}`, "g"), "")]);
    ROUND.lastIndex = 0;
  };

  if (file.endsWith(".css")) {
    // Button-like selectors: btn / button / cta / chip / pill (not dots, avatars, switches, rings).
    const rule = /([^{}]+)\{([^{}]*)\}/g;
    for (let m; (m = rule.exec(code)); ) {
      const sel = m[1];
      if (!/btn|button|cta|chip|pill/i.test(sel) || /dot|avatar|switch|ring|knob|badge|track/i.test(sel)) continue;
      const bodyStart = m.index + m[1].length + 1;
      const body = src.slice(bodyStart, bodyStart + m[2].length);
      const r = /border-radius:\s*(?![\s0])[^;]+;/g;
      for (let d; (d = r.exec(body)); ) {
        const s0 = bodyStart + d.index;
        hits.push({ file, line: src.slice(0, s0).split("\n").length, text: `${sel.trim().slice(0, 60)} { ${d[0]} }` });
        edits.push([s0, s0 + d[0].length, "border-radius: 0;"]);
      }
    }
  } else {
    // 1. Button / link elements: their className literals and the same-file constants they use.
    const consts = new Map<string, [number, number][]>();
    const decl = /const\s+([A-Za-z_$][\w$]*)\s*=\s*((?:["`][^"`]*["`]\s*\+?\s*)+)/g;
    for (let m; (m = decl.exec(code)); ) {
      const spans: [number, number][] = [];
      const lit = /["`][^"`]*["`]/g;
      for (let l; (l = lit.exec(m[2])); ) spans.push([m.index + m[0].indexOf(m[2]) + l.index, m.index + m[0].indexOf(m[2]) + l.index + l[0].length]);
      consts.set(m[1], spans);
    }
    for (let m; (m = BUTTON_TAGS.exec(code)); ) {
      const end = tagEnd(code, m.index);
      const tag = code.slice(m.index, end);
      const ci = tag.indexOf("className=");
      if (ci < 0) continue;
      const attrStart = m.index + ci;
      const lit = /["`][^"`]*["`]/g;
      const region = code.slice(attrStart, end);
      const spans: [number, number][] = [];
      for (let l; (l = lit.exec(region)); ) spans.push([attrStart + l.index, attrStart + l.index + l[0].length]);
      // Follow constants up to three levels (cls → `${BASE} ${tone}` → BASE).
      const seen = new Set<string>();
      const follow = (text: string, depth: number) => {
        if (depth > 3) return;
        for (const id of text.match(/[A-Za-z_$][\w$]*/g) ?? []) {
          if (seen.has(id) || !consts.has(id)) continue;
          seen.add(id);
          for (const sp of consts.get(id)!) {
            spans.push(sp);
            follow(src.slice(sp[0], sp[1]), depth + 1);
          }
        }
      };
      follow(region, 1);
      const all = spans.map(([a, b]) => src.slice(a, b)).join(" ");
      if (roundAllowed(all, tag)) continue;
      // A link is "button-styled" when padded like a button; card tiles (column, all-round padding) are not.
      if (m[1] === "a" || m[1] === "Link") {
        const buttonish = /(?<![\w-])px-/.test(all) && !/flex-col|(?<![\w-])p-(?:[3-9]|1\d|\[)/.test(all);
        if (!buttonish) continue;
      }
      for (const [a, b] of spans) if (!edits.some(([x]) => x === a)) flag(a, b);
    }
    // 2. Shared chip / button constants used outside button tags (Scott: chips square too).
    for (const [name, spans] of consts) {
      if (!/CHIP|BTN|BUTTON|CTA|PILL/i.test(name)) continue;
      for (const [a, b] of spans) if (!edits.some(([x]) => x === a)) {
        const t = src.slice(a, b);
        if (!roundAllowed(t, "")) flag(a, b);
      }
    }
    // 3. Email HTML buttons: inline border-radius on <a> / pill <span>.
    const inline = /<(a|span)\b[^>]*style="[^"]*border-radius:\s*(?!0[;"])[^;"]+;?/g;
    for (let m; (m = inline.exec(src)); ) {
      const r = /border-radius:\s*(?!0[;"])[^;"]+;?/.exec(m[0])!;
      const s0 = m.index + r.index;
      hits.push({ file, line: src.slice(0, s0).split("\n").length, text: m[0].slice(0, 110) });
      edits.push([s0, s0 + r[0].length, "border-radius:0;"]);
    }
  }

  if (edits.length) {
    files++;
    if (FIX) {
      edits.sort((x, y) => y[0] - x[0]);
      for (const [a, b, t] of edits) src = src.slice(0, a) + t + src.slice(b);
      writeFileSync(file, src);
      touched.add(file);
    }
  }
}

if (FIX) {
  console.log(`check:button-shape --fix — ${hits.length} rounded button classes squared in ${touched.size} files`);
  process.exit(0);
}
if (hits.length) {
  console.log(`check:button-shape — ${hits.length} rounded buttons in ${files} files\n`);
  for (const h of process.env.ALL ? hits : hits.slice(0, 40)) console.log(`  ✗ ${h.file}:${h.line}  ${h.text}`);
  process.exit(1);
}
console.log("check:button-shape — every button is square-cornered");
