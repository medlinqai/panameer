import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { canProvideServices } from "@/lib/access";
import { settingsNavFor } from "@/lib/settings-nav";
import { getSettingsStatuses } from "@/lib/settings";

export const metadata = { title: "Settings · Panameer" };

export default async function SettingsIndex() {
  const viewer = await guardPage("authenticated");
  const sections = settingsNavFor(canProvideServices(viewer));
  const statuses = await getSettingsStatuses(viewer);

  return (
    <div className="pb-8">
      <h1 className="font-display text-[20px] font-bold tracking-[-0.3px] text-ink">
        Your settings
      </h1>
      <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-2">
        Where each part of your account stands. The list on the left is how you
        move between them.
      </p>

      {}
      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {sections.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full min-h-[44px] flex-col rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
            >
              <b className="font-display text-[14.5px] font-bold leading-[1.3] text-ink">
                {s.label}
              </b>
              {}
              {statuses[s.href] ? (
                <span className="mt-1 text-[13px] font-semibold leading-snug text-ink">
                  {statuses[s.href]}
                </span>
              ) : (
                <span className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  {s.blurb}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
