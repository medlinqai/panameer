import { AreaTabs } from "@/components/casing/AreaTabs";
import { AREA_EYEBROW, SUPPORT_TABS } from "@/lib/account-areas";

// Support area (Scott 2026-10-05): Tickets · Report a Problem · Help.
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AreaTabs eyebrow={AREA_EYEBROW.support} tabs={SUPPORT_TABS} />
      {children}
    </>
  );
}
