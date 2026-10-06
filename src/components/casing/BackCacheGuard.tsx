"use client";

import { useEffect } from "react";

// After Sign Out, Back must not show the signed-in app from the browser's page cache: reload, and the
// server sends a signed-out visitor to /login.
export function BackCacheGuard() {
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  return null;
}
