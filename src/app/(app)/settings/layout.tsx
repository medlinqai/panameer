import { SettingsSectionList } from "@/components/settings/SettingsSectionList";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { canProvideServices } from "@/lib/access";
import { guardPage } from "@/lib/guard";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await guardPage("authenticated");

  return (
    <>
      {}
      {}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/settings"
      />
      {}
      {}
      <div className="mx-auto w-full max-w-6xl px-5 pt-5 sm:px-8 md:grid md:grid-cols-[210px_minmax(0,1fr)] md:gap-7">
        <SettingsSectionList isProvider={canProvideServices(viewer)} />
        <div className="min-w-0 pt-5 md:pt-0">{children}</div>
      </div>
    </>
  );
}
