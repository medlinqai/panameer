export function HeroVideoBackdrop({
  src,
  poster,
  videoClassName,
  scrimClassName,
}: {
  src: string;
  poster?: string;
  /** Positioning + opacity for the clip. Caller owns it; the layers differ per hero. */
  videoClassName: string;
  /** The gradient re-laid over the footage. Must match the card's own background ramp. */
  scrimClassName: string;
}) {
  return (
    <>
      <video
        data-autoplay-video
        aria-hidden
        tabIndex={-1}
        className={videoClassName}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        style={{ pointerEvents: "none" }}
      />
      <div aria-hidden className={scrimClassName} />
    </>
  );
}
