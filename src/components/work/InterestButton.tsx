"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

// EX-E003: I'm Interested — one click, undoable.
export function InterestButton({ id, on: initial, signedIn = true }: { id: string; on: boolean; signedIn?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (!signedIn) return <a href="/join" className={BTN} data-interest-signup>I&apos;m Interested</a>;
  return (
    <button type="button" disabled={busy} className={on ? BTN_OUT : BTN} data-interest={on ? "on" : "off"} onClick={async () => {
      setBusy(true);
      const r = await fetch("/api/external-jobs/interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, on: !on }) }).catch(() => null);
      setBusy(false);
      if (r?.ok) { setOn(!on); router.refresh(); }
    }}>{on ? "Interested ✓ · Undo" : "I'm Interested"}</button>
  );
}
