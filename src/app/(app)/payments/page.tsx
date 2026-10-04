import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";

export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs
        sequence={tabSequenceFor("/payments")} tabs={PAGE_TABS["/payments"]} current="/payments" />
      <ComingSoon title="Payments" />
    </div>
  );
}
