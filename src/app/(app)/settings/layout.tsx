import { SettingsNav } from "@/components/settings/SettingsNav";
import { SettingsHeading } from "@/components/settings/SettingsHeading";
import { guardPage } from "@/lib/guard";

/**
 * Settings shell (J2.4 WS-G / E013).
 *
 * NOW INSIDE THE CONSOLE. This used to be its own full-page area with its own
 * logo header and a "← Back to dashboard" link — a second chrome for a
 * signed-in user, reached from the same avatar as everything else. Moving it
 * under `(app)` gives it the dark rail, the console header and the footer,
 * which is WS0's rule applied: one casing for every authenticated page. The
 * back link goes with the second header, because the rail is the way out now.
 *
 * ONE DOOR → AN IN-PAGE LEFT-NAV, and deliberately not the Task Panel. The page
 * heading comes from the same definition the nav does, so the two cannot
 * disagree about what a page is called.
 *
 * AUTHORITATIVE SERVER-SIDE GATE stays exactly where it was. `guardPage` is
 * what enforces provider-only, independently of the edge proxy — the edge is a
 * fast first line and must never be the only one.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("canProvideServices");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-8 md:grid-cols-[232px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0">
          <SettingsHeading />
          {children}
        </div>
      </div>
    </div>
  );
}
