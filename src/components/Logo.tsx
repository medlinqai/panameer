import Link from "next/link";
import Image from "next/image";

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
