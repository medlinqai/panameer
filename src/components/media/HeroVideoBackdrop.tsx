/**
 * The Learn hero's dark video treatment, extracted so a second hero can render
 * THE SAME THING rather than a lookalike.
 *
 * Lifted verbatim out of `LearnHome`'s hero section (E026), which now calls
 * this instead of carrying its own copy. Two heroes with two hand-written
 * <video> tags is two chances for them to drift — different opacity, one of
 * them missing `playsInline` and letting iOS open a fullscreen player over the
 * page, one of them forgetting `aria-hidden` and announcing a decorative clip
 * to a screen reader.
 *
 * ── THE TWO LAYERS ARE ONE IDEA ──────────────────────────────────────────────
 *
 * The footage never carries the contrast. A gradient is painted UNDER the video
 * (by the caller, as the card's own background) and re-laid OVER it here as the
 * scrim, so white text sits on a known dark ramp regardless of what the camera
 * saw or whether the clip has loaded yet. That is why the scrim is part of this
 * component and not left to the caller to remember.
 *
 * ── REDUCED MOTION IS DECIDED IN CSS, NOT JAVASCRIPT ─────────────────────────
 *
 * `data-autoplay-video` + the `prefers-reduced-motion` rule in globals.css —
 * the same mechanism `VideoSequence` uses. The Learn hero previously gated the
 * video with `usePrefersReducedMotion()`, which works, but it forces every
 * caller to be a client component. `/` is a static, island-free page and its
 * own header comment makes that a build gate, so the hook would have cost the
 * marketing home an island to decide something one media query already knows.
 * CSS also wins before any JavaScript loads rather than after.
 *
 * Either way the fallback is identical to Learn's: the video disappears and the
 * gradient underneath — which was always the thing guaranteeing legibility — is
 * what remains. No poster needed.
 */
export function HeroVideoBackdrop({
  src,
  videoClassName,
  scrimClassName,
}: {
  src: string;
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
