import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";

/**
 * Authenticated app shell — the MEDLINQ-STYLE CASING (MASTER WS9).
 *
 * The light SideRail is replaced by AppShell: dark rail + header + footer, one
 * chrome for every authenticated page. The switch from the public top nav still
 * happens at login; MeProvider still loads /api/me for the rail and header.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
