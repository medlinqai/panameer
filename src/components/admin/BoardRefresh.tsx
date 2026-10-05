"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function BoardRefresh({ readAt }: { readAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => startTransition(() => router.refresh()), 30_000);
    return () => clearInterval(t);
  }, [auto, router]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="border-[1.5px] border-line px-4 py-1.5 text-[13.5px] font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "Refresh"}
      </button>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#d72cd6]"
        />
        Auto-refresh every 30s
      </label>
      <span className="text-[12.5px] text-ink-2">Data read at {readAt}</span>
    </div>
  );
}
