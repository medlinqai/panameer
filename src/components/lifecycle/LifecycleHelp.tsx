"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { BUYER_ROAD } from "@/lib/user-levels";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { RoadStepper } from "@/components/lifecycle/RoadStepper";

// The "?" next to "Your Path · Step N of 8". It signals one host in AppShell, so closing the account menu can't unmount the panel.
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
  const [path, setPath] = useState<{ road: "provider" | "buyer"; current: number; waiting?: { key: string; label: string } | null } | null>(null);
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
            Eight stops, 10–15 minutes to be found. Win work three ways at stop 5, deliver it, request payment, get paid. Payout details come last, only what your country needs. Panameer pays companies, not individuals.
          </p>
          <div className="hidden overflow-x-auto sm:block"><div className="min-w-[640px]"><RoadGraphic current={path.current} /></div></div>
          <div className="sm:hidden"><RoadStepper current={path.current} /></div>
          <p className="mt-2 flex flex-wrap gap-x-5 text-[13.5px]">
            <a href="/join/provider/road" className="font-bold text-magenta-dark underline underline-offset-4">See the Detailed Road →</a>
            <a href="/help/road" className="font-bold text-magenta-dark underline underline-offset-4">Questions?</a>
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-[14px] text-ink-2">
            Six stops: your account and company, then find a provider, order or post a job, approve the work and pay the invoice. Panameer contracts with and pays companies, not individuals.
          </p>
          <div className="hidden overflow-x-auto sm:block"><div className="min-w-[560px]"><RoadGraphic current={path?.current ?? 0} road={BUYER_ROAD} label="Buyer road" waiting={path?.waiting} /></div></div>
          <div className="sm:hidden"><RoadStepper current={path?.current ?? 0} road={BUYER_ROAD} waiting={path?.waiting} /></div>
        </>
      )}
    </Modal>
  );
}
