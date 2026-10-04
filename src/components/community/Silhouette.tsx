import "./face.css";
export function Silhouette({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pm-sil ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 44 44" width={size} height={size}>
        <circle cx="22" cy="22" r="22" className="pm-sil-bg" />
        <circle cx="22" cy="17.5" r="6.4" className="pm-sil-ink" />
        <path
          d="M 11.6 36.4 a 10.4 10 0 0 1 20.8 0 Z"
          className="pm-sil-ink"
        />
      </svg>
    </span>
  );
}

/**
 * ⚠ A face where one may or may not exist: the photo when there is one, the
 * silhouette when there is not. ⚠⚠ ONE DECISION IN ONE PLACE, so no caller can
 * accidentally fall back to initials.
 *
 * ⚠ `alt=""` on the photo for the same reason the glyph is `aria-hidden` — the
 * person's name is always rendered next to it.
 */
export function Face({
  photoUrl,
  size = 44,
  className = "",
}: {
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (!photoUrl) return <Silhouette size={size} className={className} />;

  /*
    ── ⚠⚠⚠ THE SILHOUETTE SITS **BEHIND** THE PHOTO, NOT INSTEAD OF IT ───────

    ⚠⚠ MEASURED ON THE REAL PAGE, 2026-09-20: `Test User 5` has a non-null
    `photo_url` whose image DOES NOT LOAD, and the card rendered as a bare
    magenta circle — the halo with nothing in it. ⚠ A null photo was handled;
    a photo that is present and BROKEN was not, and it is the more common case
    on seeded data.

    ⚠⚠ THIS IS THE TECHNIQUE `components/Avatar.tsx` ALREADY USES and the one
    thing about it worth keeping: the fallback is a LAYER UNDERNEATH, so a 404,
    a blocked host, a transparent 1×1 or an empty `src` all reveal it with no
    `onError` handler and no client JavaScript. ⚠ This is a SERVER COMPONENT —
    an `onError` would make every card in the grid a client component.
    ⚠ What is NOT kept is the initials: the layer underneath is the silhouette.
  */
  return (
    <span
      className={`pm-face-wrap ${className}`}
      style={{ width: size, height: size }}
    >
      <Silhouette size={size} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        className="pm-face"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
