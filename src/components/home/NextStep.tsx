import Link from "next/link";
import type { Step } from "@/lib/your-next-step";
import { BTN } from "@/components/hire/HireUI";

// WK-E007: every Job, Request, Order and Payment page — Your Next Step (with its button) or Waiting on {who}.
export function NextStep({ step }: { step: Step }) {
  if (!step) return null;
  return "next" in step ? (
    <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-state-pending bg-state-pending-bg px-4 py-3" data-next-step>
      <span><span className="block text-[10.5px] font-bold tracking-[0.12em] text-state-pending">YOUR NEXT STEP</span><b className="text-[15px]">{step.next.text}</b></span>
      <Link href={step.next.href} className={BTN}>{step.next.label}</Link>
    </div>
  ) : (
    <div className="my-4 rounded-[12px] border border-dashed border-state-border px-4 py-3" data-waiting>
      <span className="block text-[10.5px] font-bold tracking-[0.12em] text-state-inactive">WAITING</span><span className="text-[14.5px]">{step.waiting}</span>
    </div>
  );
}
