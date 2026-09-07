import { PackagesManager } from "@/components/packages/PackagesManager";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { sellGaps } from "@/lib/gate-reads";
import { canProvideServices } from "@/lib/access";

/**
 * Packages — the provider's sellable catalog (brief_V / E045).
 *
 * Deliberately a SETTINGS surface, not an onboarding step: onboarding stays at
 * 13 steps and packages never gate profile publish. A provider builds their
 * catalog once they're live, and can keep adding to it forever.
 *
 * The provider-only gate is the settings layout's `guardPage`; every write
 * re-checks ownership server-side in `src/lib/packages.ts`.
 */
export default async function SettingsPackagesPage() {
  /* ⚠ `P1-ALL-E034` — the `SELL` gate, computed here and MIRRORED in the manager.
     The boundary is `setPackageStatus`; this is so a seller learns what
     publishing needs while they are still building, not at the button. */
  /* ⚠ `authenticated` (`P2-J1.1-E046`) — ⚠ SUPERSEDED, quoted:
     `guardPage("canProvideServices")`. One of three layers; see
     `settings/layout.tsx` and `route-access.ts`. Scott opened the tree whole. */
  const viewer = await guardPage("authenticated");
  const gaps = await sellGaps(viewer.userId);

  return (
    <div className="space-y-6">
      {/*
        ── ⚠⚠ THE SECOND TAB ROW CAME OFF THIS PAGE (`P2-J1.1-E046`, 2026-09-06) ──

        ⚠ SUPERSEDED, quoted not deleted:
          `<PageTabs sequence={tabSequenceFor("/settings/packages")}`
          `          tabs={PAGE_TABS["/settings/packages"]}`
          `          current="/settings/packages" className="mb-0" />`
        with the note: *"E216 — 'Sell My Services' flattened; its two children
        are this row."*

        ⚠ WS-2 GAVE SETTINGS A TOP TAB ROW, so this page rendered TABS INSIDE
        TABS — the settings row from the layout, then this pair directly beneath
        it. That is the double-menu Scott rejected, turned on its side.

        ⚠⚠ RESOLVED THE OTHER WAY ROUND — THE PAIR BECOMES A LINK, NOT A TAB SET,
        AND THE REASON IS THAT IT WAS NEVER A SUB-NAV OF THIS PAGE. Its second
        entry points at `/services/offers`, which is NOT under `/settings` at
        all. Promoting the pair to top-level settings tabs would put a
        non-settings route in the settings row and would need a `SETTINGS_NAV`
        entry — a heading and a blurb for a page that lives in another area. So
        the cross-area half becomes what it always was: a link out.

        ⚠ `PAGE_TABS["/settings/packages"]` IS DELIBERATELY LEFT IN `nav.ts`.
        `pageTitleFor` reads `Object.values(PAGE_TABS).flat()` to title tab
        destinations, and it is where `/services/offers` gets its page title —
        deleting the set would retitle that page from its URL segment.
      */}
      <section className="rounded-brand border border-line p-6">
        <h2 className="text-[18px] font-bold">Service Products</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          A package is a fixed offering buyers can buy outright — a defined
          scope, a timeline and a price. Published packages appear in the
          Packages section of your public profile. They&apos;re optional: your
          profile publishes and stays visible with or without them.
        </p>
        {/* ⚠ ONLY TO SOMEONE WHO CAN OPEN IT. `/services/offers` requires
            `canProvideServices`; this page no longer does, so an unconditional
            link would be a buyer clicking through to /dashboard?noaccess=1 —
            the exact class WS-4 exists to end, re-introduced by WS-2. */}
        {canProvideServices(viewer) && (
          <p className="mt-3 text-[14.5px] text-ink-2">
            <Link href="/services/offers" className="font-semibold text-magenta hover:underline">
              Offers for My Services
            </Link>{" "}
            — what buyers have offered for the work you sell.
          </p>
        )}
      </section>

      <section className="rounded-brand border border-line p-6">
        <PackagesManager sellGaps={gaps} />
      </section>
    </div>
  );
}
