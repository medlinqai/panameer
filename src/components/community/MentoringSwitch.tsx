"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Open for Mentoring as a switch in the Mentors hero, its state written under it.
export function MentoringSwitch({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const flip = async () => {
    const next = !on;
    setOn(next);
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/provider/mentoring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ open: next }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setOn(!next);
      setErr("That didn't save.");
      return;
    }
    router.refresh();
  };
  return (
    <span data-mentoring-switch className="inline-flex flex-col">
      <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={flip} className="inline-flex min-h-11 items-center gap-2.5 border border-ink bg-surface px-4 text-[14px] font-semibold">
        <span aria-hidden className={"relative inline-block h-[20px] w-[36px] rounded-full transition-colors " + (on ? "bg-ink" : "bg-[#C9CDDC]")}>
          <span className={"absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white transition-all " + (on ? "left-[18px]" : "left-[2px]")} />
        </span>
        Open for Mentoring
      </button>
      <span className="mt-1 text-[12px] text-ink-2">{err ?? (on ? "On · people can find you and ask" : "Off · people can't find you yet")}</span>
    </span>
  );
}
