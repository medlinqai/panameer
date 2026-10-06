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

/** A face where one may or may not exist: the photo when there is one, the */
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

  // THE SILHOUETTE SITS BEHIND THE PHOTO, NOT INSTEAD OF IT
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
