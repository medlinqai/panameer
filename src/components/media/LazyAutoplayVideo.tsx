"use client";

import { useEffect, useRef } from "react";

export function LazyAutoplayVideo({
  src,
  poster,
  className,
  rootMargin = "600px",
}: {
  src: string;
  poster?: string;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getAttribute("src")) return;

    const load = () => {
      el.setAttribute("preload", "metadata");
      el.setAttribute("src", src);
      el.load();
      void el.play().catch(() => {});
    };

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
