import Image from "next/image";
import {
  Banknote, Boxes, Building2, BugPlay, Code, Cpu, Database, DraftingCompass,
  Factory, Flag, GraduationCap, HeartPulse, Landmark, LayoutGrid, Lightbulb,
  RadioTower, RefreshCw, ShieldCheck, ShoppingBag, Shuffle, Sparkles, Tag,
  Truck, Workflow, Zap,
} from "lucide-react";
import type { Mark, MarkTone } from "@/lib/catalog-marks";

/**
 * ONE 34px ROUNDED SQUARE, WHATEVER IS INSIDE IT (`P1-A1.5-E465` / `E471`).
 *
 * ⚠⚠ THE SIZE IS THE POINT. A logo row, a `P2P` row and an icon row must occupy
 * exactly the same box or the tree's left column zig-zags — which is the thing
 * Medlinq's catalog gets right and the reason Scott pointed at it.
 *
 * ⚠⚠ THERE IS NO MARK ON A SKILL, AND `Skill.image_url` IS THE TRAP. The column
 * exists, so adding one looks free. ⚠ THERE ARE 710 SKILLS: nobody is sourcing
 * 710 images, the column would be a few percent filled, and the tree would
 * render a ragged mix of pictures and blanks — WORSE THAN NONE.
 * ⚠ Scott's *"each of the applications have to have an image"* describes Medlinq,
 * where a practice has ~40 services. ⚠⚠ 27 SPECIALIZATIONS IS HAND-MAPPABLE.
 * 710 SKILLS IS NOT. That is the whole difference, and it is why skills carry
 * their ALIASES instead — real content, already in the database.
 *
 * ⚠ NEVER A BROKEN IMAGE, NEVER A BLANK BOX. An unmapped row falls back to its
 * group's generic icon, muted. Provider-authored `is_custom` rows are
 * permanently unmapped by definition.
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote, Boxes, Building2, BugPlay, Code, Cpu, Database, DraftingCompass,
  Factory, Flag, GraduationCap, HeartPulse, Landmark, LayoutGrid, Lightbulb,
  RadioTower, RefreshCw, ShieldCheck, ShoppingBag, Shuffle, Sparkles, Tag,
  Truck, Workflow, Zap,
};

/*
  ── ⚠ THE TONES (`P1-A1.5-E465b`) ──────────────────────────────────────────

  ⚠ SAME `-100` FILL / `-800` TEXT PAIRING THE CONSOLE TILES ALREADY USE
  (`ConsolePage.tsx:63`), so no new colour system arrives with this.
  ⚠⚠ NO MAGENTA, FUCHSIA, PINK OR ROSE. `E433` reserves magenta for interactive
  things and a mark is not clickable; the near-magenta hues are excluded too
  because at 34px they read as the brand colour.
  ⚠ Written as whole class tokens, never concatenated — Tailwind v4 scans source
  text and never evaluates JavaScript (`E338`).
*/
const TONES: Record<MarkTone, string> = {
  neutral: "border-line bg-ink/[0.04] text-ink-2",
  sky: "border-sky-200 bg-sky-100 text-sky-800",
  violet: "border-violet-200 bg-violet-100 text-violet-800",
  amber: "border-amber-200 bg-amber-100 text-amber-800",
  emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
  teal: "border-teal-200 bg-teal-100 text-teal-800",
  indigo: "border-indigo-200 bg-indigo-100 text-indigo-800",
  cyan: "border-cyan-200 bg-cyan-100 text-cyan-800",
  orange: "border-orange-200 bg-orange-100 text-orange-800",
  lime: "border-lime-200 bg-lime-100 text-lime-800",
  blue: "border-blue-200 bg-blue-100 text-blue-800",
};

const BOX_BASE =
  "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border ";

/*
  ⚠⚠ THE VENDOR MONOGRAMS STAY NEUTRAL, AND THAT IS NOT AN OVERSIGHT.

  ⚠ They stand in for logos held back on licence. Giving `OFC` a colour INVENTS
  A BRAND COLOUR FOR ORACLE — the exact trade-dress edge the licence hold
  stepped back from. A neutral tile says "no logo yet"; a coloured one says
  "this is Oracle's colour", and it is not ours to say.
  ⚠ AND IT READS BETTER: once everything else carries a hue, the neutral tile
  becomes the SIGNAL for "vendor" — the absence becomes a category rather than a
  gap, and dropping a real licensed logo in later changes nothing around it.
*/
const box = (tone?: MarkTone) => BOX_BASE + TONES[tone ?? "neutral"];
const BOX = BOX_BASE + TONES.neutral;

export function CatalogMark({ mark }: { mark?: Mark | null }) {
  /* ⚠ THE FALLBACK IS A MARK, NOT AN ABSENCE — the column stays straight. */
  if (!mark) {
    return (
      <span className={BOX} aria-hidden>
        <Tag className="h-[16px] w-[16px] opacity-50" />
      </span>
    );
  }

  if (mark.kind === "vendor") {
    /*
      ⚠⚠ A LOGO ONLY IF ONE IS LICENSED. `logo` is empty on every vendor today —
      see `catalog-marks.ts` for the licence reasoning — so this branch is built,
      unreachable, and one line away from being live.
    */
    if (mark.logo) {
      return (
        <span className={BOX}>
          <Image
            src={mark.logo}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
          />
        </span>
      );
    }
    /*
      ⚠ THE MONOGRAM IS NOT A LOGO AND NOT TRADE DRESS: initials only, on the
      same neutral tile as every other mark — no wordmark, no brand colour, no
      glyph. ⚠ IT IS DELIBERATELY NOT TRYING TO LOOK LIKE THE REAL THING.
    */
    return (
      <span className={BOX} title={mark.monogram}>
        <span className="font-display text-[11px] font-bold tracking-tight">
          {mark.monogram}
        </span>
      </span>
    );
  }

  if (mark.kind === "chip") {
    /*
      ⚠⚠ THE CHIP IS THE ROW'S REAL NAME SHORTENED, NOT DECORATION. `P2P`,
      `O2C`, `R2R` are what practitioners say and what Scott's own project files
      are named. ⚠ Four of the nine Operations domains already carry the
      abbreviation inside the label, which is the proof the short form is the
      name rather than an invention.
    */
    return (
      <span className={box(mark.tone)}>
        <span className="font-display text-[10.5px] font-bold tracking-tight">
          {mark.chip}
        </span>
      </span>
    );
  }

  const Icon = (mark.icon && ICONS[mark.icon]) || Tag;
  return (
    <span className={box(mark.tone)} aria-hidden>
      <Icon className="h-[16px] w-[16px]" />
    </span>
  );
}
