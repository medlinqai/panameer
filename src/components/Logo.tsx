import Link from "next/link";
import Image from "next/image";

/**
 * The Panameer wordmark, ON-LIGHT (WS4 / E002).
 *
 * ⚠ SUPERSEDED TWICE, QUOTED NOT DELETED — it read *"The new looped-P wordmark in
 * navy…"*, then `E397` corrected the mark and left the word "navy" standing.
 * `E400` retires both: the letterforms are Comfortaa 600 with a normal P, and the
 * ink is `#272334`. The on-dark (white) variant is rendered by `AppRail` and the
 * two footers.
 *
 * ── ⚠⚠ v2: A NORMAL P, ONE DARK, THE MARK AT 1.19× (`P1-ALL-E400`) ──────────
 *
 * ⚠ SUPERSEDES `E397`'s `panameer-lockup-on-light.png`, WHICH IS KEPT (`E164` —
 * nothing is deleted). Scott saw E397's lockup in the rail and the footer and
 * said, twice, *"this is off."* He was right, and the reason is measurable.
 *
 * MEASURED by reading each file's ink boxes, not eyeballed:
 *     E397  mark/wordmark 0.821 · gap 0.340   ← the mark clings to the P
 *     v2    mark/wordmark 1.190 · gap 0.260   ← Scott's own reference ratio
 * ⚠ AND THE LOOPED P MADE IT WORSE: its bowl is a closed circle beside the mark's
 * square aperture — two near-identical shapes — so at 96px the old lockup read
 * **"OPanameer"**. v2 is real Comfortaa 600 with a NORMAL P; the collision is gone.
 *
 * ⚠⚠ AND THERE IS NO NAVY. The wordmark this replaces was `#171c35` — hue 230°,
 * THE ONLY THING IN THE SET OUTSIDE THE VIOLET FAMILY (the rail `#272334` is
 * 254°). v2's ink is `#272334` exactly, sampled from the file: the wordmark IS the
 * rail colour now. ⚠ `panameer-lockup-navy.png` exists in `4. Logo/v2/` as the SAME
 * BYTES under a name Scott rejected — it is deliberately not placed and nothing
 * references it.
 *
 * ⚠⚠ THE ASSET IS 1642×278 NOW (621×128 before, 524×132 before that) AND
 * `width`/`height` MOVED WITH IT AGAIN — **the aspect changed, 5.91 vs 4.85**, so
 * leaving the old numbers would squash the artwork rather than merely mis-size it.
 * ⚠ `MarketingHeader` nudges this by `-translate-y-[3px]`, and it was RE-DERIVED
 * for v2 rather than assumed: the ink centroid sits **+1.75px** below box centre at
 * `h-10` (E397: +2.45) and the x-height band **+4.10px** (E397: +7.19), so the
 * middle of the two is **2.93px**. The shipped 3px still holds and nothing there
 * changed.
 *
 * Both new assets are genuinely transparent, which the old `panameer-logo.png`
 * was not — its background pixels were opaque white and boxed the mark on any
 * tinted surface. That is why the old file had a hand-repaired `-transparent`
 * twin; the new artwork needs no such repair.
 *
 * Always route logo rendering through this component so a stray asset path
 * can't creep back in.
 */
export function Logo({
  className = "h-8 w-auto",
  href = "/",
  priority = false,
}: {
  className?: string;
  /** Set to null to render the mark without wrapping it in a link. */
  href?: string | null;
  priority?: boolean;
}) {
  const img = (
    <Image
      src="/brand/panameer-lockup-ink.png"
      alt="Panameer"
      width={1642}
      height={278}
      priority={priority}
      className={className}
    />
  );

  if (href === null) return img;

  return (
    <Link href={href} aria-label="Panameer home">
      {img}
    </Link>
  );
}
