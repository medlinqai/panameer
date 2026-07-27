import { PackagesManager } from "@/components/packages/PackagesManager";

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
export default function SettingsPackagesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-brand border border-line p-6">
        <h2 className="text-[18px] font-bold">Packages</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          A package is a fixed offering buyers can buy outright — a defined
          scope, a timeline and a price. Published packages appear in the
          Packages section of your public profile. They&apos;re optional: your
          profile publishes and stays visible with or without them.
        </p>
      </section>

      <section className="rounded-brand border border-line p-6">
        <PackagesManager />
      </section>
    </div>
  );
}
