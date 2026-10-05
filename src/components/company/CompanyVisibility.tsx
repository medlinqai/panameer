"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Visibility: is the company name shown on members' public profiles? Admins toggle it; members see the state.
export function CompanyVisibility({ on, canEdit }: { on: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(on);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!canEdit || busy) return;
    const next = !value;
    setBusy(true);
    setValue(next);
    const r = await fetch("/api/company/visibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ show: next }) }).catch(() => null);
    if (!r?.ok) setValue(!next);
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="mt-6 border-t border-line pt-[22px]" data-company-visibility={value ? "on" : "off"}>
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.12em] text-magenta-dark">Visibility</p>
      <div className="flex items-center justify-between gap-3 text-[13.5px] font-semibold">
        <span>Shown on our people&apos;s profiles</span>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label="Show the company name on our people's profiles"
          disabled={!canEdit || busy}
          onClick={toggle}
          className={"relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-default " + (value ? "bg-ink" : "bg-line")}
        >
          <span className={"absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition-all " + (value ? "left-[19px]" : "left-[3px]")} />
        </button>
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-3">
        {canEdit ? "Turn off to hide the company name from your team's public profiles." : "Only an admin can change this."}
      </p>
    </div>
  );
}
