"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// BT-E004: fields filled from the résumé stay marked until the provider confirms them.
export function ResumePrefillBanner({ fields }: { fields: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    const r = await fetch("/api/profile/resume-prefill", { method: "POST" });
    setBusy(false);
    if (r.ok) router.refresh();
  };
  return (
    <div data-resume-prefill className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-magenta py-1 pl-3 text-[14px]">
      <span>
        <b>From your résumé:</b> {fields.join(", ")}. Check them{fields.includes("Location") ? <> — your <Link href="/profile/edit/contact" className="font-semibold underline underline-offset-4">location</Link> saves when you save Contact</> : null}, then confirm.
      </span>
      <button type="button" disabled={busy} onClick={confirm} data-confirm-prefill className="min-h-9 bg-ink px-4 text-[13px] font-semibold text-surface disabled:opacity-40">{busy ? "Saving…" : "Looks Right"}</button>
    </div>
  );
}
