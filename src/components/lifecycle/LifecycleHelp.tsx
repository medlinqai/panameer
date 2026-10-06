"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { LifecycleGraphic } from "@/components/lifecycle/LifecycleGraphic";

// The "?" next to "Your Path · Step N of 7". It signals one host in AppShell, so closing the account menu can't unmount the panel.
const EVENT = "pm:lifecycle-help";

export function LifecycleHelp({ className = "", onOpen }: { className?: string; onOpen?: () => void }) {
  return (
    <button
      type="button"
      aria-label="How the lifecycle works"
      title="How the lifecycle works"
      data-lifecycle-help
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.();
        window.dispatchEvent(new Event(EVENT));
      }}
      className={"inline-grid h-[18px] w-[18px] shrink-0 place-items-center border border-current text-[11px] font-bold leading-none hover:bg-ink hover:text-surface " + className}
    >
      ?
    </button>
  );
}

export function LifecycleHelpHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="How Panameer works" width="max-w-5xl">
      <p className="mb-4 text-[14px] text-ink-2">
        Buyers and sellers follow the same seven steps. You do the first three. Your company does the rest — Panameer contracts with and pays companies, never individuals.
      </p>
      <LifecycleGraphic />
    </Modal>
  );
}
