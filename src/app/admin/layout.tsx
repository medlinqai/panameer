import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { guardPage } from "@/lib/guard";

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
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
