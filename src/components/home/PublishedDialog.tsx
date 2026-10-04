"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

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
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="published-title"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-line bg-surface p-7 text-center"
      >
        <CircleCheck className="mx-auto h-10 w-10 text-magenta" strokeWidth={1.5} aria-hidden />
        <h2 id="published-title" className="mt-3 text-[22px] font-bold text-ink">
          Your profile is live
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Review and edit your profile any time from your picture in the upper right.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/profile"
            className="inline-flex min-h-11 items-center border border-ink bg-surface px-6 text-[14px] font-semibold text-ink hover:bg-surface-hover"
          >
            View my profile
          </Link>
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center bg-ink px-8 text-[14px] font-semibold text-surface hover:bg-ink-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
