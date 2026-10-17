import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { getSessionViewer } from "@/lib/session";

// Scott 10-17: seller registration sits inside the app casing (top bar + footer); the menu opens once sign-up is done.
export default async function SellerRegisterLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getSessionViewer();
  if (!viewer) return <>{children}</>;
  return (
    <MeProvider>
      <AppShell locked>{children}</AppShell>
    </MeProvider>
  );
}
