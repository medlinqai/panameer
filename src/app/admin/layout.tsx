import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { guardPage } from "@/lib/guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("canAdminister");
  return (
    <MeProvider>
      <AppShell>
        {}
        <div>
          {}
          <div className="pm-white-page mx-auto w-full max-w-[1200px]">{children}</div>
        </div>
      </AppShell>
    </MeProvider>
  );
}
