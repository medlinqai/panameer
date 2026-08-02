import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { guardPage } from "@/lib/guard";
import { TaskPanel } from "@/components/console/TaskPanel";

/**
 * The Platform Console now wears THE SAME CASING as the rest of the app
 * (WS1/WS4). It used to have its own two-pane chrome with a light rail and a
 * hand-rolled nav — which is why the admin's console looked like a different
 * product from the one they administer, and why the E009 mockup reads as a
 * correction rather than an addition.
 *
 * The server gate is unchanged and still authoritative: canAdminister here, the
 * edge proxy as the fast first line. Fail closed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("canAdminister");
  return (
    <MeProvider>
      <AppShell>
        {/*
          The task panel is fixed to the right edge, so it sits OUTSIDE the
          content flow — and the content reserves the strip's width at lg so a
          wide table never runs underneath it.
        */}
        <div className="lg:pr-[68px]">{children}</div>
        <TaskPanel />
      </AppShell>
    </MeProvider>
  );
}
