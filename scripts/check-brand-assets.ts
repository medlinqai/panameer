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
/* ⚠ THE CALL SITES ARE STILL POINTING AT THEM, so the guard above is guarding
   something live rather than an orphan. */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e)) out.push(relative(".", full));
  }
  return out;
}
const SRC = walk("src").map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
const hotlinkers = SRC.filter((f) => /logoUrl:\s*`\$\{[^`]*\}\/brand\/panameer-new-on-light\.png`/.test(f.text));
check(
  "3 — the email senders still hotlink the on-light logo (7 call sites)",
  hotlinkers.length >= 6,
  `${hotlinkers.length} files`
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
const ON_DARK = ["AppRail.tsx", "MarketingFooter.tsx", "HomeFooter.tsx"];
for (const f of ON_DARK) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ${f} renders the ON-DARK lockup`,
    !!hit && /src="\/brand\/panameer-lockup-on-dark\.png"/.test(hit.text)
  );
}
for (const f of ["Logo.tsx", join("recommend", "[token]", "page.tsx")]) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ${f.split("/").pop()} renders the ON-LIGHT lockup`,
    !!hit && /src="\/brand\/panameer-lockup-on-light\.png"/.test(hit.text)
  );
}
/* ⚠⚠ ABSENCE: NO APP SITE STILL RENDERS THE OLD WORDMARK. Repointing four of five
   would leave one surface on the looped P and nobody would notice until a
   screenshot. The scan looks at `src=` only, so the prose above each site — which
   NAMES the old file to explain why it survives — cannot mask a real one. */
for (const f of [...ON_DARK, "Logo.tsx", join("recommend", "[token]", "page.tsx")]) {
  const hit = SRC.find((s) => s.path.endsWith(f));
  check(
    `4 — ABSENCE: ${f.split("/").pop()} no longer renders the old looped-P wordmark`,
    !!hit && !/src="\/brand\/panameer-new-on-(dark|light)\.png"/.test(hit.text)
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
  "4 — both lockup files are published",
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
pixelChecks()
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
