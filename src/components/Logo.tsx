import Link from "next/link";
import Image from "next/image";

/**
 * The Panameer wordmark (brief_P / E007).
 *
 * Uses `panameer-logo-transparent.png`, NOT `panameer-logo.png`. The original
 * asset has an alpha channel but its background pixels are opaque WHITE, so on
 * any tinted surface (the light-purple verify page, the bg-soft cards) it
 * rendered as a white box around the logo. The transparent variant was produced
 * by flood-filling the background from the edges, which clears the surround
 * while preserving the white counters inside the letterforms.
 *
 * Always route logo rendering through this component so the wrong asset can't
 * creep back in on a tinted background.
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
      src="/brand/panameer-logo-transparent.png"
      alt="Panameer"
      width={786}
      height={111}
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
