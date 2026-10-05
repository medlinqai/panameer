import { AreaTabs } from "@/components/casing/AreaTabs";
import { AREA_EYEBROW, accountTabs } from "@/lib/account-areas";
import { canProvideServices } from "@/lib/access";
import { guardPage } from "@/lib/guard";

// Account area (Scott 2026-10-05): today's settings pages under one tab row.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await guardPage("authenticated");
  return (
    <>
      <AreaTabs eyebrow={AREA_EYEBROW.account} tabs={accountTabs(canProvideServices(viewer))} />
      <div className="mx-auto w-full max-w-5xl px-5 pt-3 sm:px-8">{children}</div>
    </>
  );
}
