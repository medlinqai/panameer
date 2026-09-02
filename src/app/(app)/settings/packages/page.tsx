import { PackagesManager } from "@/components/packages/PackagesManager";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";
import { guardPage } from "@/lib/guard";
import { sellGaps } from "@/lib/gate-reads";

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
  const viewer = await guardPage("canProvideServices");
  const gaps = await sellGaps(viewer.userId);

  return (
    <div className="space-y-6">
      {/* E216 — "Sell My Services" flattened; its two children are this row. */}
      <PageTabs
        tabs={PAGE_TABS["/settings/packages"]}
        current="/settings/packages"
        className="mb-0"
      />

      <section className="rounded-brand border border-line p-6">
        <h2 className="text-[18px] font-bold">Service Products</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          A package is a fixed offering buyers can buy outright — a defined
          scope, a timeline and a price. Published packages appear in the
          Packages section of your public profile. They&apos;re optional: your
          profile publishes and stays visible with or without them.
        </p>
      </section>

      <section className="rounded-brand border border-line p-6">
        <PackagesManager sellGaps={gaps} />
      </section>
    </div>
  );
}
