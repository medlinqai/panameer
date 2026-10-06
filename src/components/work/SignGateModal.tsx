"use client";

import Link from "next/link";
import { Modal } from "@/components/Modal";

// The one block on Your Path: both companies need Legal & Tax before a work order is awarded or signed.
export type SignGate = { items: { company: string; item: string; done: boolean }[]; isAdmin: boolean };

export function SignGateModal({ gate, onClose }: { gate: SignGate | null; onClose: () => void }) {
  return (
    <Modal open={!!gate} onClose={onClose} title="Before you sign">
      {gate && (
        <div data-sign-gate>
          <p className="text-[16px] font-bold">Finish Legal &amp; Tax to sign this work order</p>
          <p className="mt-1 text-[13.5px] text-ink-2">A work order is a contract. Both companies need these on file — the other side sees only &ldquo;Verified&rdquo;.</p>
          <ul className="mt-3 border-t border-line">
            {gate.items.map((i) => (
              <li key={`${i.company}-${i.item}`} className="flex items-center justify-between gap-3 border-b border-line/60 py-2 text-[14px]">
                <span>
                  {i.company} · {i.item.toLowerCase()}
                </span>
                <span className={"text-[12px] font-bold " + (i.done ? "text-[#1f8a5b]" : "text-[#b26b00]")}>{i.done ? "✓ Done" : "Needed"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-2">Your proposal and this work order are saved. Come back and sign once it&apos;s done.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-[42px] border border-ink px-4 text-[13px] font-bold">
              Later
            </button>
            {gate.isAdmin ? (
              <Link href="/company/legal" className="inline-flex min-h-[42px] items-center bg-ink px-4 text-[13px] font-bold text-surface">
                Finish Legal &amp; Tax
              </Link>
            ) : (
              <span className="inline-flex min-h-[42px] items-center text-[13px] font-semibold text-ink-2">Ask your company admin to finish Legal &amp; Tax.</span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
