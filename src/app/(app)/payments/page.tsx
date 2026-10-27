import { ComingSoon } from "@/components/ComingSoon";
import { ActionCards } from "@/components/home/AppNav";
import { areaActions } from "@/lib/area-actions";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";

export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  const viewer = await guardPage("authenticated");
  const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, providerProfile: { select: { id: true } } } });
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs
        sequence={tabSequenceFor("/payments")} tabs={PAGE_TABS["/payments"]} current="/payments" />
      {/* WA-E003: this area's actions first. */}
      {person && <div className="mb-6 mt-4" data-area-actions="payments"><ActionCards cards={await areaActions("payments", person.id, person.providerProfile ? "provider" : "buyer")} /></div>}
      <ComingSoon title="Payments" />
    </div>
  );
}
