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

  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 font-semibold text-black/60 dark:bg-white/15 dark:text-white/70"
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
