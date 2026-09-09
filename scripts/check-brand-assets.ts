/**
 * `check:brand-assets` — one icon source, and the files delivered mail must not
 * lose (`P1-ALL-E391`). `npm run check:brand-assets`.
 *
 * ── ⚠⚠ THE TWO THINGS THIS BRIEF WAS AFRAID OF ─────────────────────────────
 *
 *   1. **TWO SOURCES FOR ONE ICON.** `src/app/favicon.ico` existed AND
 *      `layout.tsx` declared `icons` explicitly. Both emitted tags, the metadata
 *      one came last, and so the file everyone edits was not the file being
 *      used. **That is why a favicon "won't update".** Measured before the fix,
 *      quoted in `layout.tsx`.
 *   2. **OVERWRITING A HOTLINKED LOGO.** Seven senders put
 *      `${appBaseUrl()}/brand/panameer-new-on-light.png` into email that is
 *      ALREADY DELIVERED. Replacing that file silently restyles mail somebody
 *      received last month. **Leaving it means old mail keeps the logo it was
 *      sent with, which is the honest outcome** — so the file must survive
 *      forever, and a test is the only thing that can say so.
 *
 * ⚠ NO DATABASE AND NO BROWSER. Files on disk, source as text.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const md5 = (p: string) => createHash("md5").update(readFileSync(p)).digest("hex");

/* ═══ 1 · ⚠⚠ EXACTLY ONE ICON SOURCE ══════════════════════════════════════ */

const layout = readFileSync(join("src", "app", "layout.tsx"), "utf8");
/** ⚠ Comments stripped: that file QUOTES the block it removed, on purpose. */
const layoutCode = layout.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

check(
  "1 — ⚠⚠ layout.tsx declares NO icons block (the file conventions are the source)",
  !/\bicons\s*:/.test(layoutCode),
  "an explicit icons block emits tags that override src/app/icon.png"
);
/* ⚠ MUTATION: the scan must fire on the exact block that was removed. */
check(
  "1 — MUTATION: the scan catches an icons block coming back",
  /\bicons\s*:/.test('export const metadata = { icons: { icon: "/x.png" } };')
);
check(
  "1 — the scan is not fooled by the superseded block quoted in the comment",
  /icons:/.test(layout) && !/\bicons\s*:/.test(layoutCode)
);

/* The three file-convention icons exist, and are the delivered files. */
for (const [f, why] of [
  ["src/app/favicon.ico", "the legacy /favicon.ico request"],
  ["src/app/icon.png", "the tab icon"],
  ["src/app/apple-icon.png", "the iOS home-screen icon"],
] as const) {
  check(`1 — ${f} exists (${why})`, existsSync(join(...f.split("/"))));
}
/* ⚠⚠ `apple-icon`, NOT `apple-touch-icon`. A file named `apple-touch-icon.png`
   in `src/app/` is detected as NOTHING — the touch-icon name is the HTML `rel`
   value Next GENERATES, not the convention it reads. */
check(
  "1 — ABSENCE: no src/app/apple-touch-icon.* (Next would ignore it)",
  !readdirSync(join("src", "app")).some((f) => f.startsWith("apple-touch-icon"))
);

/* ═══ 2 · THE SMALL ICONS ARE THE COMPRESSED-RAMP FILES, NOT RESIZES ═══════
   ⚠ *"At 16px on a white tab bar the palest two segments of the full ramp
   disappear and the ring reads as broken."* The 16/32 files are drawn with a
   compressed ramp and a thinner band ON PURPOSE. Regenerating them from the 512
   to make them "consistent" is the mistake this guards. */

const BRAND = join("public", "brand");
check("2 — the 32px source is published", existsSync(join(BRAND, "panameer-mark-32.png")));
check("2 — the 16px source is published", existsSync(join(BRAND, "panameer-mark-16.png")));
check("2 — the 512px master is published", existsSync(join(BRAND, "panameer-mark-512.png")));
/* ⚠ THE TAB ICON IS THE 32px FILE, BYTE FOR BYTE — not a resize of the 512. */
check(
  "2 — src/app/icon.png IS the delivered 32px file, byte for byte",
  md5(join("src", "app", "icon.png")) === md5(join(BRAND, "panameer-mark-32.png"))
);
check(
  "2 — ABSENCE: the tab icon is NOT a copy of the 512px master",
  md5(join("src", "app", "icon.png")) !== md5(join(BRAND, "panameer-mark-512.png"))
);
/* ⚠ AND THE SMALL FILES ARE ACTUALLY SMALL — a resize of the 512 would be an
   order of magnitude larger. Measured: 512 is ~25KB, the 32 is ~1.4KB. */
check(
  "2 — the 32px file is small enough to be a drawn icon, not a downscale",
  statSync(join(BRAND, "panameer-mark-32.png")).size < 4000,
  `${statSync(join(BRAND, "panameer-mark-32.png")).size} bytes`
);

/* ═══ 3 · ⚠⚠ THE HOTLINKED LOGOS MUST SURVIVE ═════════════════════════════
   Seven senders put these URLs into mail that is already delivered. */

const HOTLINKED = ["panameer-new-on-light.png", "panameer-new-on-dark.png"];
for (const f of HOTLINKED) {
  check(
    `3 — ⚠⚠ ${f} still exists (already-delivered mail hotlinks it)`,
    existsSync(join(BRAND, f)),
    "deleting or renaming it changes email somebody already received"
  );
}
/* ⚠ AND THEY ARE UNCHANGED. Overwriting in place is the subtler failure —
   the file is still there, and last month's mail quietly restyles. */
/* ⚠ SIZE, NOT A PINNED HASH. A hash would have to be pasted in here by hand, and
   a hand-pasted hash that nobody can re-derive is a magic number pretending to be
   evidence — the sizes are read off the files themselves. */
for (const f of HOTLINKED) {
  /* ⚠ EXISTENCE IS CHECKED BEFORE SIZE, OR THE GATE CRASHES ON THE VERY CASE IT
     GUARDS. Found by mutation-testing this file: deleting the logo threw an
     ENOENT stack trace out of `statSync` instead of failing with a sentence, and
     a gate that crashes is harder to read than one that explains itself. */
  const path = join(BRAND, f);
  if (!existsSync(path)) {
    check(`3 — ${f} is byte-stable`, false, "the file is GONE — see the assertion above");
    continue;
  }
  /* ⚠⚠ A PINNED HASH, MEASURED OFF THE SHIPPED FILE, NOT A SIZE BAND. `E397`
     repointed every app site away from these two, so NOTHING IN THE APP RENDERS
     THEM ANY MORE — which means a careless "cleanup" that re-encodes or replaces
     one would be invisible everywhere except in mail somebody already received.
     The hash is what notices. */
  const HOTLINK_MD5: Record<string, string> = {
    "panameer-new-on-dark.png": "53a94c57fc98e98b50b8844fd8c61753",
    "panameer-new-on-light.png": "0388c9aed1652ce55aeba468907c5b33",
  };
  check(
    `3 — ⚠⚠ ${f} is BYTE-UNCHANGED`,
    md5(path) === HOTLINK_MD5[f],
    `${md5(path)} != ${HOTLINK_MD5[f]} — delivered mail just changed`
  );
}
/*
  ── ⚠⚠ NOTHING POINTS AT THEM ANY MORE, AND THE MD5 PINS MATTER MORE FOR IT ──

  ⚠ SUPERSEDED, quoted not deleted: *"⚠ THE CALL SITES ARE STILL POINTING AT
  THEM, so the guard above is guarding something live rather than an orphan."*

  `P1-ALL-E403` repointed the last seven senders to the v2 lockup, so the two
  files above are now referenced by **no code at all** — only by mail that has
  already been delivered. ⚠⚠ THAT MAKES THE MD5 PINS THE ONLY THING PROTECTING
  THEM: an orphaned file is exactly what a cleanup deletes, and the damage would
  show up nowhere except in somebody's old inbox. The pins stay forever.
*/
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e)) out.push(relative(".", full));
  }
  return out;
}
/*
  ⚠⚠ `code` IS `text` WITH COMMENTS STRIPPED, AND SECTION 7 NEEDS IT.

  The first version of the no-navy scan read `text` and found ten files — every
  one a COMMENT, and most of them PRE-EXISTING notes recording that a navy was
  already retired (`E300`, `E015`). `login/page.tsx:233` even warns that *"a
  literal in a comment is how the navy gets reintroduced"*.

  ⚠ A SCAN THAT FORBIDS NAMING THE THING YOU RETIRED MAKES IT IMPOSSIBLE TO
  DOCUMENT WHY IT WAS RETIRED — and this codebase supersedes by quoting rather
  than deleting (`E164`). So the ban is on LIVE CODE; the prose explaining it is
  exactly what should survive.
*/
const stripComments = (v: string) =>
  v.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const SRC = walk("src").map((p) => {
  const text = readFileSync(p, "utf8");
  return { path: p, text, code: stripComments(text) };
});
/*
  ⚠ SUPERSEDED, quoted: the senders were asserted to *"still hotlink the on-light
  logo (7 call sites)"*. That pinned the status quo on purpose while the swap was
  Scott's open question. He answered it on 2026-09-09, so the assertion now pins
  the ANSWER instead: every sender is on the v2 lockup and none is on the old
  mark. Same tripwire, pointed the other way.
*/
const oldMark = SRC.filter((f) =>
  /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-new-on-(light|dark)\.png`/.test(f.text)
);
check(
  "3 — ABSENCE: no sender still hotlinks the OLD looped-P mark",
  oldMark.length === 0,
  oldMark.map((h) => h.path).join(", ")
);
const v2 = SRC.filter((f) =>
  /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-lockup-ink\.png`/.test(f.text)
);
check(
  "3 — the email senders hotlink the v2 lockup (6 files)",
  v2.length === 6,
  `${v2.length} files: ${v2.map((h) => h.path).join(", ")}`
);

/* ═══ 4 · THE LOCKUPS THE APP RENDERS ═════════════════════════════════════
   ⚠ `E391` DID NOT SWAP THESE. The two files the brief named turned out to be
   BYTE-IDENTICAL to what was already installed, and the only file that would
   have changed the on-light lockup is the MAGENTA wordmark — a brand decision
   Scott left open. Asserted as-is so a later swap is deliberate. */

/*
  ⚠ SUPERSEDED BY `P1-ALL-E397`, quoted in spirit: these five assertions used to
  require `panameer-new-on-*.png` — the OLD looped-P wordmark. `E391` shipped the
  segmented square to the browser tab and stopped there because no transparent
  lockup carrying it existed, which left the app showing TWO DIFFERENT MARKS.
  `E397` closes that, so the five app sites now point at the LOCKUPS.
  ⚠⚠ THE OLD FILES ARE STILL ASSERTED TO EXIST, UNCHANGED, in section 3 — they are
  hotlinked by already-delivered mail. What moved is what the APP renders.
*/
/*
  ⚠ SUPERSEDED BY `P1-ALL-E400`: these required `panameer-lockup-on-*.png`, the
  E397 artwork. Scott saw it in the rail and the footer and said, twice, *"this is
  off."* v2 is a NORMAL P with the mark at 1.19× cap height instead of 0.82×, and
  the ink is `#272334` instead of the only blue in the set.
  ⚠⚠ E397's FILES ARE STILL ON DISK AND STILL ASSERTED — see section 6. Nothing
  is deleted (`E164`); what changed is what the APP renders.
*/
const ON_DARK = ["AppRail.tsx", "MarketingFooter.tsx", "HomeFooter.tsx"];
for (const f of ON_DARK) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ${f} renders the v2 ON-DARK lockup`,
    !!hit && /src="\/brand\/panameer-lockup-white\.png"/.test(hit.text)
  );
}
for (const f of ["Logo.tsx", join("recommend", "[token]", "page.tsx")]) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ${f.split("/").pop()} renders the v2 ON-LIGHT lockup`,
    !!hit && /src="\/brand\/panameer-lockup-ink\.png"/.test(hit.text)
  );
}
/* ⚠⚠ ABSENCE: NO APP SITE STILL RENDERS THE OLD WORDMARK. Repointing four of five
   would leave one surface on the looped P and nobody would notice until a
   screenshot. The scan looks at `src=` only, so the prose above each site — which
   NAMES the old file to explain why it survives — cannot mask a real one. */
for (const f of [...ON_DARK, "Logo.tsx", join("recommend", "[token]", "page.tsx")]) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ABSENCE: ${f.split("/").pop()} renders neither the looped-P nor the E397 lockup`,
    !!hit &&
      !/src="\/brand\/panameer-new-on-(dark|light)\.png"/.test(hit.text) &&
      !/src="\/brand\/panameer-lockup-on-(dark|light)\.png"/.test(hit.text)
  );
}
/* ⚠ AND NO COLORWAY ON THE WRONG GROUND. */
{
  const railText = SRC.find((s) => s.path.endsWith("AppRail.tsx"))?.text ?? "";
  check(
    "4 — ABSENCE: the dark rail does not render the on-light lockup",
    !/src="\/brand\/panameer-lockup-on-light\.png"/.test(railText)
  );
}
check(
  "4 — both v2 lockup files are published",
  existsSync(join(BRAND, "panameer-lockup-white.png")) &&
    existsSync(join(BRAND, "panameer-lockup-ink.png"))
);
/* ⚠ E397's ARE KEPT — superseded, not deleted (`E164`). */
check(
  "4 — E397's superseded lockups are still on disk",
  existsSync(join(BRAND, "panameer-lockup-on-dark.png")) &&
    existsSync(join(BRAND, "panameer-lockup-on-light.png"))
);
check(
  "4 — the compressed 512 master is published",
  existsSync(join(BRAND, "panameer-mark-512-compressed.png"))
);

/* ═══ 5 · ⚠⚠ THE LOCKUP'S MARK IS THE COMPRESSED RAMP — MEASURED, NOT NAMED ══

   `E391` established the failure and the metric: at icon sizes **the full ramp's
   palest ring segments fall within a few units of the canvas and the ring reads
   as broken.** The rail renders this lockup at `h-7` = 28px, which is squarely
   icon territory, so the mark inside it must be the COMPRESSED ramp.

   ⚠⚠ A FILENAME IS NOT A COLOUR. `panameer-lockup-on-dark.png` could be rebuilt
   from the full 512 tomorrow and keep its name, so this compares PIXELS: the
   palest ring pixel of the mark inside each lockup, against the two references
   already in the repo. It must sit nearer `panameer-mark-32.png` (compressed)
   than `panameer-mark-512.png` (full).

   MEASURED 2026-09-08:
     panameer-mark-32.png   (compressed ref) rgb(248,183,247)
     panameer-mark-512.png  (FULL ramp)      rgb(255,237,255)   69 away
     lockup-on-dark / -light mark            rgb(255,192,255)   24 away  ✓
*/
async function pixelChecks() {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const sharp = require("sharp") as typeof import("sharp");

  /** The palest OPAQUE ring pixel, excluding the near-white centre. */
  async function palestRing(file: string, box?: { left: number; top: number; width: number; height: number }) {
    let img = sharp(join(BRAND, file));
    if (box) img = img.extract(box);
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let best: [number, number, number] | null = null;
    let bestSum = -1;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a <= 200) continue;
      /* ⚠ THE CREAM CENTRE IS NOT THE RING. Including it would make every file
         report ~white and the assertion would compare nothing. */
      if (r > 248 && g > 245 && b > 245) continue;
      const sum = r + g + b;
      if (sum > bestSum) { bestSum = sum; best = [r, g, b]; }
    }
    return best;
  }
  const delta = (a: number[], b: number[]) => a.reduce((n, x, i) => n + Math.abs(x - b[i]), 0);

  const ref32 = await palestRing("panameer-mark-32.png");
  const ref512 = await palestRing("panameer-mark-512.png");
  check("5 — the compressed 32px reference was read", !!ref32);
  check("5 — the full-ramp 512 reference was read", !!ref512);
  check(
    "5 — the two references are genuinely different ramps",
    !!ref32 && !!ref512 && delta(ref32, ref512) > 30,
    `32=${ref32} 512=${ref512}`
  );

  for (const f of ["panameer-lockup-on-dark.png", "panameer-lockup-on-light.png"]) {
    /* The mark occupies the left square of the 621×128 lockup. */
    const mark = await palestRing(f, { left: 0, top: 0, width: 128, height: 128 });
    const dCompressed = mark && ref32 ? delta(mark, ref32) : Infinity;
    const dFull = mark && ref512 ? delta(mark, ref512) : Infinity;
    check(
      `5 — ⚠⚠ ${f}'s mark is the COMPRESSED ramp, not the full one`,
      dCompressed < dFull,
      `palest ring ${mark} — ${dCompressed} from the 32px ref, ${dFull} from the full 512`
    );
    /* ⚠ AND IT IS ACTUALLY CLOSE, not merely closer. A mark halfway between the
       two would satisfy "<" while still reading as broken at 28px. */
    check(
      `5 — and ${f}'s mark is within tolerance of the 32px reference`,
      dCompressed <= 40,
      `${dCompressed}`
    );
  }
}

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

/* ⚠ THE PIXEL WORK IS ASYNC AND THIS BUNDLE IS CJS, so there is no top-level
   await — the report runs after it resolves. ⚠⚠ A REJECTION MUST FAIL THE GATE
   rather than print a green line, which is what the `.catch` is for: an
   unreadable PNG is exactly when this assertion matters most. */
/* ═══ 6 · ⚠⚠ THE 1.19 RATIO, PINNED BY MEASUREMENT (`P1-ALL-E400` WS-4) ══════

   **A FILENAME IS NOT A RATIO.** `panameer-lockup-white.png` can be regenerated at
   any proportion tomorrow and keep its name, and 0.82 is exactly what somebody
   will "tidy" it back to — it is the value that shipped two days ago and looks
   deliberate. So this reads the PIXELS: it finds the mark's ink box and the
   wordmark's ink box, and asserts the ratio between them.

   MEASURED off both files:
     E397  mark/wordmark 0.821 · gap 0.340   <- the mark clings to the P
     v2    mark/wordmark 1.190 · gap 0.260   <- Scott's own reference image
*/
async function ratioChecks() {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const sharp = require("sharp") as typeof import("sharp");

  async function inkBoxes(file: string) {
    const { data, info } = await sharp(join(BRAND, file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;
    const alpha = (x: number, y: number) => data[(y * w + x) * ch + 3];
    const inky = (x: number) => {
      for (let y = 0; y < h; y++) if (alpha(x, y) > 40) return true;
      return false;
    };
    const cols: number[] = [];
    for (let x = 0; x < w; x++) if (inky(x)) cols.push(x);
    if (cols.length === 0) return null;
    /* ⚠ THE GAP IS THE LONGEST EMPTY COLUMN RUN between the first and last ink —
       which is what separates the mark from the wordmark, whatever their sizes. */
    let best: [number, number] | null = null;
    let run: number | null = null;
    for (let x = cols[0]; x <= cols[cols.length - 1]; x++) {
      if (!inky(x)) run = run ?? x;
      else if (run !== null) {
        if (!best || x - 1 - run > best[1] - best[0]) best = [run, x - 1];
        run = null;
      }
    }
    if (!best) return null;
    const vspan = (x0: number, x1: number) => {
      let top = -1;
      let bot = -1;
      for (let y = 0; y < h; y++) {
        for (let x = x0; x <= x1; x++) {
          if (alpha(x, y) > 40) {
            if (top < 0) top = y;
            bot = y;
            break;
          }
        }
      }
      return bot - top + 1;
    };
    const markH = vspan(cols[0], best[0] - 1);
    const wordH = vspan(best[1] + 1, cols[cols.length - 1]);
    const gap = best[1] - best[0] + 1;
    return { markH, wordH, gap, ratio: markH / wordH, gapRatio: gap / wordH };
  }

  for (const f of ["panameer-lockup-white.png", "panameer-lockup-ink.png"]) {
    const b = await inkBoxes(f);
    check(`6 — ${f}'s ink boxes were found`, !!b);
    if (!b) continue;
    /* ⚠⚠ 1.19 ± 0.05 — tight enough to catch a regeneration at 0.82, loose enough
       to survive an antialiasing difference of a pixel or two. */
    check(
      `6 — ⚠⚠ ${f}: the mark is 1.19x the wordmark (measured ${b.ratio.toFixed(3)})`,
      Math.abs(b.ratio - 1.19) < 0.05,
      `${b.ratio.toFixed(3)} — E397 shipped 0.821 and this is the number that gets "tidied" back`
    );
    check(
      `6 — ${f}: the gap is 0.26x the wordmark (measured ${b.gapRatio.toFixed(3)})`,
      Math.abs(b.gapRatio - 0.26) < 0.06,
      `${b.gapRatio.toFixed(3)}`
    );
    check(
      `6 — ABSENCE: ${f} is not E397's 0.82 proportion`,
      Math.abs(b.ratio - 0.82) > 0.1
    );
  }
  /* ⚠ MUTATION-TESTED AGAINST THE REAL SUPERSEDED FILE, which is still on disk
     precisely because `E164` keeps it — so the scan is proven to tell the two
     apart rather than proven only against the file it expects to pass. */
  const old = await inkBoxes("panameer-lockup-on-dark.png");
  check(
    "6 — MUTATION: the measurement scores E397's superseded lockup at ~0.82",
    !!old && Math.abs(old.ratio - 0.82) < 0.05,
    old ? old.ratio.toFixed(3) : "not measured"
  );
  check(
    "6 — MUTATION: and that value would FAIL the 1.19 assertion",
    !!old && Math.abs(old.ratio - 1.19) >= 0.05
  );
}

/* ═══ 7 · ⚠⚠ THERE IS NO NAVY ══════════════════════════════════════════════

   Scott: *"I am a little concerned when you say Navy. There should not be navy."*
   MEASURED: the rail `#272334` is hue 254 deg, the hero panel `#170f2c` is 257,
   and the wordmark `E400` replaced was `#171c35` — hue 230, THE ONLY THING IN THE
   SET OUTSIDE THE VIOLET FAMILY. Both the colour and the word go.
*/
/* ⚠ THE ASSET, NOT THE WORD. `navy` appears in a dozen comments recording two
   earlier retirements; what must not exist is a REFERENCE to the rejected file. */
check(
  "7 — ABSENCE: no asset named *navy* is referenced in live code",
  !SRC.some((f) => /navy[\w-]*\.(png|jpe?g|svg|webp)/i.test(f.code)),
  SRC.filter((f) => /navy[\w-]*\.(png|jpe?g|svg|webp)/i.test(f.code)).map((f) => f.path).join(", ")
);
check(
  "7 — MUTATION: that scan catches the rejected asset by name",
  /navy[\w-]*\.(png|jpe?g|svg|webp)/i.test('src="/brand/panameer-lockup-navy.png"')
);
check(
  "7 — and does NOT fire on a comment that merely names the retired colour",
  !/navy[\w-]*\.(png|jpe?g|svg|webp)/i.test("/* E300 retired the brand navy */")
);
check(
  "7 — ABSENCE: panameer-lockup-navy.png was never placed in public/brand",
  !existsSync(join(BRAND, "panameer-lockup-navy.png")),
  "it is byte-identical to -ink.png under a name Scott rejected"
);
{
  /* ⚠ THE HEX ITSELF, not just the word — a colour can be re-typed without a name. */
  /* ⚠ LIVE CODE ONLY — `Logo.tsx` names the hex in its superseded note, which is
     the record of WHY it went and must survive. */
  const blue = SRC.filter((f) => /#171c35/i.test(f.code));
  check(
    "7 — ABSENCE: #171c35 appears in no LIVE code",
    blue.length === 0,
    blue.map((f) => f.path).join(", ")
  );
  check("7 — MUTATION: the navy scan catches the word", /navy/i.test('src="/brand/panameer-lockup-navy.png"'));
  check("7 — MUTATION: the hex scan catches the colour", /#171c35/i.test("color: #171C35;"));
}

/* ═══ 8 · MARKETING LOCKUPS ARE NOT IN THE APP ═════════════════════════════
   ⚠ The magenta and tagline variants are marketing assets, and THE TAGLINE IS
   MARKETING ONLY — it does not belong on any app surface. They were deliberately
   never copied into `public/brand`, so this asserts both that no surface names one
   AND that none is sitting there waiting to be named. */
for (const f of [
  "panameer-lockup-magenta.png",
  "panameer-lockup-magenta-tagline.png",
  "panameer-lockup-white-tagline.png",
]) {
  check(`8 — ABSENCE: ${f} is not published in public/brand`, !existsSync(join(BRAND, f)));
  check(
    `8 — ABSENCE: no source file references ${f}`,
    !SRC.some((x) => x.text.includes(f)),
    SRC.filter((x) => x.text.includes(f)).map((x) => x.path).join(", ")
  );
}
check(
  "8 — MUTATION: the reference scan would catch a tagline lockup",
  'src="/brand/panameer-lockup-magenta-tagline.png"'.includes("panameer-lockup-magenta-tagline.png")
);

Promise.all([pixelChecks(), ratioChecks()])
  .then(() => {
    if (failures.length) {
      console.error(`\ncheck:brand-assets — ${failures.length} FAILED, ${pass} passed\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:brand-assets — ${pass}/${pass} passed`);
  })
  .catch((e) => {
    console.error("check:brand-assets — the pixel comparison threw:", e);
    process.exit(1);
  });
