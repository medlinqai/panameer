import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RECIPES,
  themeFromHue,
  resolveTheme,
  contrast,
  autoTextColor,
  hexToHsl,
  hslToHex,
  isValidHex,
  PANAMEER_DEFAULT_HUE,
  DEFAULT_RECIPE,
} from "@/lib/themeRecipes";

let passed = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) passed++;
  else failures.push(`${label}${detail ? "\n     " + detail : ""}`);
};

/* ---- round trips --------------------------------------------------------- */
for (const hex of ["#d127d0", "#171e3e", "#00a3a3", "#ff0000", "#123456"]) {
  const { h, s, l } = hexToHsl(hex);
  const back = hslToHex(h, s, l);
  ok(`hsl round-trip ${hex}`, back.toLowerCase() === hex.toLowerCase(), `got ${back}`);
}

/* ---- THE CENTRAL CLAIM: no hue produces unreadable output ---------------- */
// THE THRESHOLD IS AA-LARGE (3:1) FOR THE ACCENT, AND THAT IS A MEASURED
const AA_LARGE = 3.0;
for (const recipe of RECIPES) {
  let worstAccent = Infinity;
  let worstCanvas = Infinity;
  let worstSidebar = Infinity;
  for (let h = 0; h < 360; h += 5) {
    const t = themeFromHue(hslToHex(h, 70, 45), recipe.id);

    // The accent's own text is derived, so it must always clear AA-large.
    worstAccent = Math.min(worstAccent, contrast(t.brandPrimary, t.brandPrimaryText));
    // Body ink on the page canvas.
    worstCanvas = Math.min(worstCanvas, contrast(t.surfaceLight, "#171e3e"));
    // White nav labels on the sidebar.
    worstSidebar = Math.min(worstSidebar, contrast(t.surfaceDark, "#ffffff"));
  }
  ok(`${recipe.id}: accent text clears AA-large at every hue`, worstAccent >= AA_LARGE, `worst ${worstAccent.toFixed(2)}`);
  console.log(`    ${recipe.id.padEnd(6)} worst accent-text contrast ${worstAccent.toFixed(2)}:1`);
  ok(`${recipe.id}: ink on canvas always readable`, worstCanvas >= 7, `worst ${worstCanvas.toFixed(2)}`);
  ok(`${recipe.id}: white on sidebar always readable`, worstSidebar >= AA_LARGE, `worst ${worstSidebar.toFixed(2)}`);
}

/* ---- autoTextColor picks the better of the two --------------------------- */
ok("dark bg -> white text", autoTextColor("#171e3e") === "#ffffff");
ok("light bg -> dark text", autoTextColor("#faf8fc") === "#1f2937");

/* ---- structure is identical across hues ---------------------------------- */
const a = themeFromHue("#d127d0", "deep");
const b = themeFromHue("#00a3a3", "deep");
ok(
  "same recipe, different hue -> same lightness structure",
  Math.abs(hexToHsl(a.surfaceDark).l - hexToHsl(b.surfaceDark).l) < 1 &&
    Math.abs(hexToHsl(a.surfaceLight).l - hexToHsl(b.surfaceLight).l) < 1
);

/* ---- defaults ------------------------------------------------------------ */
const dflt = themeFromHue(PANAMEER_DEFAULT_HUE, DEFAULT_RECIPE);
ok("unset company resolves to the Panameer default", JSON.stringify(resolveTheme(null, null)) === JSON.stringify(dflt));
ok("garbage hue falls back", JSON.stringify(resolveTheme("not-a-hex", "deep")) === JSON.stringify(dflt));
ok("unknown recipe falls back", JSON.stringify(resolveTheme(PANAMEER_DEFAULT_HUE, "nope")) === JSON.stringify(dflt));
ok("valid pair is honoured", resolveTheme("#00a3a3", "vivid").brandPrimary !== dflt.brandPrimary);

/* ---- hex validation ------------------------------------------------------ */
ok("rejects short hex", !isValidHex("#fff"));
ok("rejects missing hash", !isValidHex("d127d0"));
ok("accepts six-digit hex", isValidHex("#D127D0"));
ok("rejects null", !isValidHex(null));

// ONE NEUTRAL FAMILY — the ramp, pinned and measured
{
  const css = readFileSync("src/app/globals.css", "utf8");

  /** Every declaration of a token, in source order. */
  const declared = (token: string) =>
    [...css.matchAll(new RegExp(`^\\s*--color-${token}:\\s*(#[0-9a-fA-F]{6});`, "gm"))].map(
      (m) => m[1].toLowerCase()
    );

  const APPROVED = { canvas: "#fafafa", "bg-soft": "#f9fafb", line: "#e5e7eb" };
  /* THE VALUES SCOTT APPROVED, VERBATIM. Mutate one → red. */
  for (const [token, value] of Object.entries(APPROVED)) {
    const all = declared(token);
    const light = token === "line" || token === "canvas" ? all.slice(0, -1).concat(all.slice(-1)) : all;
    void light;
    const lightOnly = all.filter((v) => v !== "#2b2440" && v !== "#0b0817");
    ok(
      `E432 · --color-${token} is ${value} everywhere it is declared light (${lightOnly.length} places)`,
      lightOnly.length >= 2 && lightOnly.every((v) => v === value),
      `got ${JSON.stringify(all)}`
    );
  }

  // THE THREE BLOCKS AGREE. `@theme` and `.marketing-surface` must match
  const themeBlock = css.slice(css.indexOf("@theme {"), css.indexOf("@theme inline"));
  const marketing = css.slice(css.indexOf(".marketing-surface {"));
  const pick = (block: string, token: string) =>
    block.match(new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6});`))?.[1].toLowerCase() ?? null;
  // all three blocks by that brief, and a token that is mirrored by hand but not asserted is
  for (const token of ["canvas", "bg-soft", "line", "ink", "ink-2", "ink-3", "surface", "ink-hover", "surface-hover"]) {
    ok(
      `E432 · @theme and .marketing-surface agree on --color-${token}`,
      pick(themeBlock, token) === pick(marketing, token),
      `@theme ${pick(themeBlock, token)} vs .marketing-surface ${pick(marketing, token)}`
    );
  }

  /* WHAT MUST NOT HAVE MOVED. Mutate any of these → red. */
  const UNTOUCHED: [string, string][] = [
    ["ink", "#272334"],
    ["ink-2", "#4a4658"],
    ["magenta", "#d72cd6"],
    ["magenta-dark", "#b324b2"],
    ["magenta-ink", "#a61aa5"],
    ["magenta-ink-hover", "#8e138d"],
    ["rail-active", "#b02aae"],
  ];
  for (const [token, value] of UNTOUCHED) {
    ok(`E432 · --color-${token} is UNTOUCHED (${value})`, declared(token).includes(value),
      `got ${JSON.stringify(declared(token))}`);
  }
  // THE DARK BLOCK IS UNTOUCHED — revision 2 of the brief withdrew the
  const dark = css.slice(css.indexOf(':root[data-theme="dark"] {'));
  for (const [token, value] of [["ink", "#f2f0f7"], ["ink-2", "#b3adc4"], ["line", "#2b2440"], ["canvas", "#0b0817"]]) {
    ok(`E432 · dark --color-${token} is UNTOUCHED (${value})`, pick(dark, token) === value,
      `got ${pick(dark, token)}`);
  }
  // AND THE LEARN PALETTE IS UNTOUCHED — globals.css records an incident where
  ok("E432 · the learn palette still has its full set",
    (css.match(/--color-learn-[a-z0-9-]+:/g) ?? []).length >= 6,
    `${(css.match(/--color-learn-[a-z0-9-]+:/g) ?? []).length} learn tokens`);

  /* ── THE NUMBERS THE BRIEF ASKS TO BE COMPUTED AND REPORTED ─────────────── */
  const OLD = { canvas: "#f7f7f5", bgSoft: "#f0f7f8", line: "#ece9f1" };
  const NEW = { canvas: "#fafafa", bgSoft: "#f9fafb", line: "#e5e7eb" };
  const r = (n: number) => Math.round(n * 1000) / 1000;

  const inkOnCanvas = contrast("#272334", NEW.canvas);
  const ink2OnCanvas = contrast("#4a4658", NEW.canvas);
  const groundCardBefore = contrast(OLD.canvas, "#ffffff");
  const groundCardAfter = contrast(NEW.canvas, "#ffffff");
  const lineCanvasBefore = contrast(OLD.line, OLD.canvas);
  const lineCanvasAfter = contrast(NEW.line, NEW.canvas);

  console.log("\n  E432 MEASURED ───────────────────────────────────────────");
  console.log(`    ink  #272334 on canvas ${NEW.canvas}   ${r(inkOnCanvas)}:1`);
  console.log(`    ink2 #4a4658 on canvas ${NEW.canvas}   ${r(ink2OnCanvas)}:1`);
  console.log(`    ground-to-card   ${r(groundCardBefore)}:1 → ${r(groundCardAfter)}:1  (must go DOWN)`);
  console.log(`    line-on-canvas   ${r(lineCanvasBefore)}:1 → ${r(lineCanvasAfter)}:1  (must go UP)`);
  console.log(`    line-on-card     ${r(contrast(OLD.line, "#ffffff"))}:1 → ${r(contrast(NEW.line, "#ffffff"))}:1`);
  console.log(`    bg-soft on canvas ${r(contrast(OLD.bgSoft, OLD.canvas))}:1 → ${r(contrast(NEW.bgSoft, NEW.canvas))}:1`);
  console.log("  ─────────────────────────────────────────────────────────\n");

  /* AA AND AAA FOR BODY TEXT — the brief's required contrast. */
  ok(`E432 · ink on canvas is AA+AAA (${r(inkOnCanvas)}:1)`, inkOnCanvas >= 7);
  ok(`E432 · ink-2 on canvas is AA+AAA (${r(ink2OnCanvas)}:1)`, ink2OnCanvas >= 7);

  // THE PRINCIPLE, AS AN ASSERTION: STRUCTURE COMES FROM THE RULE, NOT THE
  ok(`E432 · ground-to-card separation went DOWN (${r(groundCardBefore)} → ${r(groundCardAfter)})`,
    groundCardAfter < groundCardBefore);
  ok(`E432 · line-on-canvas separation went UP (${r(lineCanvasBefore)} → ${r(lineCanvasAfter)})`,
    lineCanvasAfter > lineCanvasBefore);
  // AND THE RULE IS NOW ACTUALLY VISIBLE ON THE GROUND, which it was not
  ok(`E432 · the rule is visible on the page ground (${r(lineCanvasAfter)}:1 > 1.1)`,
    lineCanvasAfter > 1.1);

  // FIXED, AND NOW ASSERTED — `--color-bg-soft` IN DARK MODE
  const cssForDark = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
  const darkBlock = cssForDark.slice(css.indexOf(':root[data-theme="dark"] {'));
  const darkBgSoft = /--color-bg-soft:\s*(#[0-9a-f]{3,8})/i.exec(
    darkBlock.slice(0, darkBlock.indexOf("\n}"))
  )?.[1];
  ok(
    "E763 · --color-bg-soft has a value in the dark scope",
    Boolean(darkBgSoft),
    "the dark block defines ink/ink-2/line/canvas; without bg-soft it falls through to the LIGHT value"
  );
  if (darkBgSoft) {
    const c = contrast("#b3adc4", darkBgSoft);
    ok(
      `E763 · ink-2 on the dark bg-soft clears AA (${r(c)}:1 on ${darkBgSoft})`,
      c >= 4.5,
      "a light-only panel colour behind themed text is the E723 defect"
    );
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
