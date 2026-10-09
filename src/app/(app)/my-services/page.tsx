import { ServiceProductsManager } from "@/components/service-products/ServiceProductsManager";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { sellGaps } from "@/lib/gate-reads";
import { canProvideServices } from "@/lib/access";

export default async function SettingsServiceProductsPage() {
  const viewer = await guardPage("canProvideServices");
  const gaps = await sellGaps(viewer.userId);

  return (
    <div className="space-y-6">
      {}
      <section className="rounded-brand border border-line p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold">Service Products</h2>
          <Link href="/catalog/products/new" className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover">Create a Service Product</Link>
        </div>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          A package is a fixed offering buyers can buy outright — a defined
          scope, a timeline and a price. Published packages appear in the
          Packages section of your public profile. They&apos;re optional: your
          profile publishes and stays visible with or without them.
        </p>
        {}
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
        <ServiceProductsManager sellGaps={gaps} />
      </section>
    </div>
  );
}
