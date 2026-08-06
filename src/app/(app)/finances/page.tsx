import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

/**
 * GET PAID — Payments (E216).
 *
 * The rail item flattened, so its two children are this page's tab row rather
 * than a flyout. The page body itself is still the honest stub it was: there is
 * no payments model, and a tab row above a placeholder is not a claim that
 * there is — it is where the views will be when there is something in them.
 */
export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs tabs={PAGE_TABS["/finances"]} current="/finances" />
      <ComingSoon title="Payments" />
    </div>
  );
}
