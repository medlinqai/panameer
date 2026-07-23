/**
 * A user avatar. Renders the photo when present, otherwise an initials
 * placeholder — no external image host needed (CSP-safe for the marketing side
 * and fine everywhere else).
 */
export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 48,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-black/10 font-semibold text-black/60 dark:bg-white/15 dark:text-white/70"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
