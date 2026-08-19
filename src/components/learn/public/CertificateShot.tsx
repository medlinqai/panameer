import { Check } from "@/components/learn/public/shared";

/**
 * SECTION 2 — the certificate, on a pale magenta wash.
 *
 * ⚠ `FREE — ALWAYS` IS A PRICING COMMITMENT IN MARKETING COPY, not a decoration, and it is
 * flagged to the counsel gate along with section 2's "No tiers, no trial, no card." Both are
 * the kind of line that is expensive to walk back. Shipped as Scott approved it.
 */
export function CertificateShot() {
  return (
    <div className="rounded-[16px] bg-magenta/10 p-6">
      <div className="rounded-[14px] border-[1.5px] border-magenta bg-white p-6 text-center shadow-[0_18px_44px_-28px_rgba(215,44,214,0.5)]">
        <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.16em] text-magenta">
          Certificate of Completion
        </p>
        <p className="mt-3 font-display text-[21px] font-bold leading-[1.2] tracking-[-0.4px] text-ink">
          Procure-to-Pay with AI Agents
        </p>
        <p className="mt-2 text-[12.5px] text-ink-2">Alex Rivera · verified by Panameer</p>
        <span
          aria-hidden
          className="mx-auto mt-5 grid h-[38px] w-[38px] place-items-center rounded-full bg-magenta text-white"
        >
          <Check className="h-[17px] w-[17px]" />
        </span>
        <p className="mt-5">
          <span className="rounded-full bg-[#eaf7f1] px-3 py-[5px] font-display text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#137a51]">
            Free — always
          </span>
        </p>
      </div>
    </div>
  );
}
