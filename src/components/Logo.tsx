import Link from "next/link";
import Image from "next/image";

/**
 * The Panameer wordmark, ON-LIGHT (WS4 / E002).
 *
 * The new looped-P wordmark in navy, for white and tinted surfaces. The rail's
 * on-dark (white-letter) variant lives in AppRail.
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
      src="/brand/panameer-new-on-light.png"
      alt="Panameer"
      width={524}
      height={132}
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
