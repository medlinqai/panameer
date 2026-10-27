"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// GT-E001: Admin › Settings — one row per switch.
export function SettingsSwitches({ rows }: { rows: { key: string; label: string; help: string; on: boolean }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const flip = async (key: string, value: boolean) => {
    setBusy(key);
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    setBusy(null);
    router.refresh();
  };
  return (
    <ul className="border-t border-line" data-settings>
      {rows.map((r) => (
        <li key={r.key} data-setting={r.key} className="flex items-start justify-between gap-4 border-b border-line py-4">
          <span className="min-w-0">
            <b className="text-[15px]">{r.label}</b>
            <span className="block text-[13px] text-ink-2">{r.help}</span>
          </span>
          <button type="button" role="switch" aria-checked={r.on} aria-label={r.label} disabled={busy === r.key} onClick={() => flip(r.key, !r.on)} className={r.on ? "relative h-[22px] w-[38px] shrink-0 rounded-full bg-ink" : "relative h-[22px] w-[38px] shrink-0 rounded-full bg-state-border"}>
            <span className={r.on ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white"} />
          </button>
        </li>
      ))}
    </ul>
  );
}
