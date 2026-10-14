import { guardPage } from "@/lib/guard";
import { SETTINGS, getSetting, type SettingKey } from "@/lib/platform-settings";
import { SettingsSwitches } from "@/components/admin/SettingsSwitches";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Admin · Panameer" };

export default async function Page() {
  await guardPage("canAdminister");
  const rows = await Promise.all((Object.keys(SETTINGS) as SettingKey[]).map(async (k) => ({ key: k, label: SETTINGS[k].label, help: SETTINGS[k].help, on: await getSetting(k) })));
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-[28px] font-bold">Settings</h1>
      <p className="mb-5 mt-1 text-[14px] text-ink-2">Platform switches. Each one is off by default and can be turned back off at any time.</p>
      <SettingsSwitches rows={rows} />
    </div>
  );
}
