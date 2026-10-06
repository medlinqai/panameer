// A company logo, whole: fit inside a white tile (inline, so dark mode's bg-white remap can't darken it) with even padding (never cropped), in light and dark.
// The image is pinned inside the tile so a tall or wide file can't grow the box and get clipped.
export function CompanyLogoTile({ src, alt, className = "", pad = "10%" }: { src: string; alt: string; className?: string; pad?: string }) {
  return (
    <span data-logo-tile className={`relative block overflow-hidden ${className}`} style={{ background: "#ffffff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} data-logo-img className="absolute block object-contain" style={{ inset: pad, width: `calc(100% - 2 * ${pad})`, height: `calc(100% - 2 * ${pad})` }} />
    </span>
  );
}
