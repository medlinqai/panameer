"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * "Your Profile is Now Live!" (MASTER WS13 / E149).
 *
 * Shown once, on arrival at Home from publish. The copy is the brief's, and it
 * is only accurate because of WS10: it tells the provider to click their image
 * in the upper right, and after the casing there IS an image in the upper right
 * that opens a menu with My Profile in it.
 *
 * The flag is stripped from the URL on mount, so a refresh — or a shared link —
 * doesn't announce the news twice.
 */
export function PublishedDialog() {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("published") !== "1") return;
    setOpen(true);
    router.replace("/dashboard", { scroll: false });
  }, [params, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="published-title"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-brand bg-white p-7 text-center shadow-brand"
      >
        <p className="text-[34px]" aria-hidden>
          🎉
        </p>
        <h2
          id="published-title"
          className="mt-2 font-display text-[24px] font-bold tracking-[-0.4px]"
        >
          Your Profile is Now Live!
        </h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
          Review and edit your profile by clicking your image in the upper right
          and selecting My Profile.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-6 rounded-full bg-magenta px-8 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
