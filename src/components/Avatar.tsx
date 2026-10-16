export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 48,
  onDark = false,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: number;
  /** Sitting on the dark rail — light initials on a light-tint disc so they read. */
  onDark?: boolean;
}) {
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
