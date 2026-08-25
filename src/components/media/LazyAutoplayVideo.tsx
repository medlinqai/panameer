"use client";

import { useEffect, useRef } from "react";

/**
 * ── ⚠⚠ THE DECORATIVE CLIP THAT DOES NOT DOWNLOAD UNTIL IT IS APPROACHED ────
 *
 * `P1-J1-E018`, measured on `c962c56` against a production build under DevTools'
 * own Fast 3G preset: `/find-work` pulled **11.01MB on first load, 10.63MB of it
 * video**, and the four clips `VideoSequence` renders BELOW THE FOLD finished
 * their first frame at 4.9s / 6.4s / 9.5s / 16.7s. Every one of those bytes was
 * spent before the visitor had scrolled to any of them, and the page has no hero
 * clip at all — so the section nobody had reached yet cost more than the hero
 * ever would.
 *
 * ── WHY THIS IS JAVASCRIPT WHEN THE REST OF THE VIDEO STORY IS CSS ──────────
 *
 * ⚠ IT WAS CHECKED FOR A NO-JS ANSWER FIRST AND THERE ISN'T ONE. `loading="lazy"`
 * is defined for `<img>` and `<iframe>` ONLY — there is no such attribute on
 * `<video>`, and `preload="none"` is overridden the moment `autoplay` is present,
 * which is the whole reason the eager cost exists. Reduced motion stays in CSS
 * (see below); "has the reader got near it yet" cannot be expressed in CSS at
 * all, so it is one `IntersectionObserver` and nothing more.
 *
 * ⚠ THE ELEMENT IS RENDERED FROM THE FIRST PAINT — only its `src` is withheld.
 * The card's poster is painted as the article's own `background-image` by the
 * caller, so there is nothing to lay out later and nothing that can shift.
 *
 * ── ⚠ REDUCED MOTION GETS *BETTER*, NOT DIFFERENT ──────────────────────────
 *
 * `globals.css` hides `[data-autoplay-video]` under `prefers-reduced-motion`, and
 * that attribute is kept, so the CSS still decides. But a `display:none` element
 * has no box, never intersects, and therefore never gets a `src` — which means a
 * reduced-motion visitor now downloads **zero** video bytes. Before this, the
 * clip was hidden and still fetched. The comment in `globals.css` says
 * *"a paused <video> still downloads"*; so does a hidden one.
 *
 * ⚠ NO `IntersectionObserver` (very old browser, or a JS failure) FALLS BACK TO
 * LOADING IMMEDIATELY — the same behaviour as before this component existed. A
 * missing optimisation must never become a missing video.
 */
export function LazyAutoplayVideo({
  src,
  poster,
  className,
  /**
   * How far ahead of the viewport to start fetching. 600px is roughly one more
   * card-height of scroll at every width these render at, which is enough for
   * the first frame to be there on arrival without pre-fetching a section the
   * reader may never reach.
   */
  rootMargin = "600px",
}: {
  src: string;
  poster?: string;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  /*
    ── ⚠ THE `src` IS SET ON THE ELEMENT, NOT THROUGH STATE, AND THAT IS THE POINT

    The obvious shape is `useState(false)` flipped by the observer. It works, and
    it costs a re-render per card AND trips the repo's own lint rule about
    calling setState synchronously inside an effect (the no-`IntersectionObserver`
    fallback has to do exactly that).

    ⚠ THIS COMPONENT NEVER RE-RENDERS — no state, and `src` / `poster` /
    `className` are literals from a module-level constant — so there is no
    reconciliation pass that could undo the attribute. Setting it directly is the
    same transition React would perform, minus the render. If this ever grows a
    changing prop, it needs state again.
  */
  useEffect(() => {
    const el = ref.current;
    if (!el || el.getAttribute("src")) return;

    const load = () => {
      el.setAttribute("preload", "metadata");
      el.setAttribute("src", src);
      el.load();
      /*
        The `autoplay` attribute alone is enough in every browser that matters;
        this is the belt for the case where the element made its autoplay
        decision before a `src` existed. `.catch` because a rejected play() is an
        UNHANDLED REJECTION and `check:ui` fails a page with any console error.
      */
      void el.play().catch(() => {});
    };

    /* ⚠ NO OBSERVER (ancient browser, or a JS failure) LOADS IMMEDIATELY. A
       missing optimisation must never become a missing video. */
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src, rootMargin]);

  return (
    <video
      ref={ref}
      data-autoplay-video
      aria-hidden
      tabIndex={-1}
      className={className}
      /* ⚠ NO `src` AND `preload="none"` UNTIL APPROACHED. The whole optimisation. */
      poster={poster}
      preload="none"
      autoPlay
      muted
      loop
      playsInline
      style={{ pointerEvents: "none" }}
    />
  );
}
