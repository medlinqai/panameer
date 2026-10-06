import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { BackCacheGuard } from "@/components/casing/BackCacheGuard";
import { getSessionViewer } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getSessionViewer();
  if (!viewer) return <>{children}</>;
  return (
    <MeProvider>
      <BackCacheGuard />
      <AppShell>{children}</AppShell>
    </MeProvider>
  );
}
