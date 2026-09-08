import Link from "next/link";
import Image from "next/image";

/**
 * The Panameer wordmark, ON-LIGHT (WS4 / E002).
 *
 * ⚠ SUPERSEDED (`P1-ALL-E397`), QUOTED NOT DELETED — this read *"The new looped-P
 * wordmark in navy…"*. The lockup now carries the SEGMENTED-SQUARE mark; the
 * looped P is gone from the app entirely. The wordmark LETTERFORMS are untouched
 * — the lockup composites this same navy wordmark beside the mark.
 * The navy variant is for white and tinted surfaces; the rail's on-dark
 * (white-letter) variant lives in AppRail.
 *
 * ⚠⚠ THE ASSET IS 621×128 NOW, NOT 524×132, AND `width`/`height` MOVED WITH IT.
 * `next/image` needs the intrinsic size; leaving the old numbers would letterbox
 * the artwork. ⚠ `MarketingHeader` nudges this by `-translate-y-[3px]`, measured
 * against the OLD art — RE-MEASURED for the new lockup and it still holds: the
 * ink centroid sits +2.45px below box centre at `h-10` versus +2.19px before, so
 * the same 3px remains the right middle. Nothing there needed changing.
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
      src="/brand/panameer-lockup-on-light.png"
      alt="Panameer"
      width={621}
      height={128}
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
