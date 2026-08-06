import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

/**
 * Offers for My Services — a titled placeholder (WS1-B).
 *
 * E216 — reached from its section's TAB ROW now, not a rail flyout. The route,
 * its title and its gate are real; only the content is pending, which is why a
 * titled empty state is the honest thing rather than a 404 or a fake table.
 */
export const metadata = { title: "Offers for My Services · Panameer" };

export default async function Page() {
  await guardPage("canProvideServices");
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs tabs={PAGE_TABS["/settings/packages"]} current="/services/offers" />
      <ComingSoon title="Offers for My Services" />
    </div>
  );
}
