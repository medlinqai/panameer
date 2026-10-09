"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { LifecycleGraphic } from "@/components/lifecycle/LifecycleGraphic";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { RoadStepper } from "@/components/lifecycle/RoadStepper";

// The "?" next to "Your Path · Step N of 9". It signals one host in AppShell, so closing the account menu can't unmount the panel.
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
  const [path, setPath] = useState<{ road: "provider" | "buyer"; current: number } | null>(null);
  useEffect(() => {
    const show = () => {
      setOpen(true);
      fetch("/api/your-path")
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => setPath(b?.path ?? null))
        .catch(() => {});
    };
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="How Panameer works" width="max-w-5xl">
      {path?.road === "provider" ? (
        <>
          <p className="mb-2 text-[14px] text-ink-2">
            Nine stops from sign-up to getting paid. You can sell before any company paperwork — that comes right before your first work order. Panameer pays companies, not individuals.
          </p>
          <div className="hidden overflow-x-auto sm:block"><div className="min-w-[640px]"><RoadGraphic current={path.current} /></div></div>
          <div className="sm:hidden"><RoadStepper current={path.current} /></div>
          <a href="/join/provider/road" className="mt-2 inline-block text-[13.5px] font-bold text-magenta-dark underline underline-offset-4">See the detailed road (offers, work requests, interviews) →</a>
        </>
      ) : (
        <>
          <p className="mb-4 text-[14px] text-ink-2">
            Buyers follow seven steps. You do the first four. Your company does the rest — Panameer contracts with and pays companies, not individuals.
          </p>
          <LifecycleGraphic />
        </>
      )}
    </Modal>
  );
}
