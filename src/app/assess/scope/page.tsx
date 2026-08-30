import { ComingSoon } from "@/components/ComingSoon";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

/**
 * "See the detailed scope assessment →" and "Book a 20-min call".
 *
 * AN HONEST STUB, per the brief. The scoped-requirements generator (Pillar →
 * Offering → Functional Area → Transaction → Task, with Owner tags) is the
 * engine spec's next chunk and does not exist; neither does a booking
 * integration. A page that pretended to either would be the fake-live the rails
 * forbid, and a dead link would be worse.
 */
export default function ScopePage() {
  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">
        <div className="py-16">
          <ComingSoon title="The Detailed Scope Assessment" />
          <p className="mx-auto mt-4 max-w-2xl px-6 text-center text-[15px] text-ink-2">
            Your report shows the moves and what they&rsquo;re worth. The full scope — every
            requirement, who owns it, and a pre-filled Work Request for each — is being
            built. In the meantime, the 20-minute call is where we walk your numbers.
          </p>
        </div>
      </main>
    </div>
  );
}
