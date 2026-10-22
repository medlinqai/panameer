/** NA-E001: a provider not yet revealed to this viewer reads "Provider P-1038". */
export const isMaskedName = (name: string) => /^Provider P-/.test(name.trim());

/** NA-E001 / MR-E001: an unrevealed provider — their photo when they have one (the name stays hidden), else ink with a white outline. */
export function NeutralAvatar({ size = 48, square = false, className = "", photoUrl }: { size?: number; square?: boolean; className?: string; photoUrl?: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (photoUrl) return <img src={photoUrl} alt="" width={size} height={size} data-provider-photo className={`shrink-0 object-cover ${square ? "rounded-[6px]" : "rounded-full"} ${className}`} style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden
      data-neutral-avatar
      className={`inline-flex shrink-0 items-center justify-center bg-ink ${square ? "rounded-[6px]" : "rounded-full"} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" className="fill-none stroke-white stroke-[1.6]" style={{ width: size * 0.55, height: size * 0.55 }}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    </span>
  );
}

export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 48,
  onDark = false,
  masked,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: number;
  /** Sitting on the dark rail — light initials on a light-tint disc so they read. */
  onDark?: boolean;
  /** Unrevealed provider → the neutral avatar (also detected from a "Provider P-…" name). */
  masked?: boolean;
}) {
  if (masked ?? isMaskedName(`${firstName} ${lastName}`)) return <NeutralAvatar size={size} photoUrl={photoUrl} />;
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className={
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold " +
        (onDark
          ? "bg-white/20 text-white ring-1 ring-white/40"
          : "bg-black/10 text-black/60 dark:bg-white/15 dark:text-white/70")
      }
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={`${firstName} ${lastName}`.trim() || undefined}
    >
      {initials}
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      )}
    </span>
  );
}
