"use client";

import Link from "next/link";
import { Modal } from "@/components/Modal";

// WN-E001: a work order needs the buyer's billing details (legal name, billing address, invoice email) and the provider's company linked.
export type SignGate = { items: { company: string; item: string; done: boolean; href?: string }[]; isAdmin: boolean };

export function SignGateModal({ gate, onClose }: { gate: SignGate | null; onClose: () => void }) {
  return (
    <Modal open={!!gate} onClose={onClose} title="Before you sign">
      {gate && (
        <div data-sign-gate>
          <p className="text-[16px] font-bold">Finish your company details to sign this order</p>
          <p className="mt-1 text-[13.5px] text-ink-2">An order is a contract between two companies: the buyer&apos;s billing details are on file and the provider&apos;s company is linked. No tax forms here — payout details come later, before the provider is paid.</p>
          <ul className="mt-3 border-t border-line">
            {gate.items.map((i) => (
              <li key={`${i.company}-${i.item}`} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-[14px]">
                <span>
                  {i.company} · {i.href && !i.done && gate.isAdmin ? <Link href={i.href} className="font-semibold text-magenta-dark underline underline-offset-2">{i.item.toLowerCase()}</Link> : i.item.toLowerCase()}
                </span>
                <span className={"text-[12px] font-bold " + (i.done ? "text-[#1f8a5b]" : "text-[#b26b00]")}>{i.done ? "✓ Done" : "Needed"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-2">Your response and this order are saved. Come back and sign once it&apos;s done.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-[42px] border border-ink px-4 text-[13px] font-bold">
              Later
            </button>
            {gate.isAdmin ? (
              <Link href={gate.items.find((i) => !i.done && i.href)?.href ?? "/company/legal#billing"} className="inline-flex min-h-[42px] items-center bg-ink px-4 text-[13px] font-bold text-surface">
                Add the Missing Details
              </Link>
            ) : (
              <span className="inline-flex min-h-[42px] items-center text-[13px] font-semibold text-ink-2">Ask your company admin to add them.</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
