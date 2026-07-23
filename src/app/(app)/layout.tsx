import { MeProvider } from "@/components/MeProvider";
import { Header } from "@/components/Header";

/**
 * Authenticated app shell. These routes sit behind the proxy auth gate
 * (src/proxy.ts), so we can assume a session; MeProvider loads /api/me for the
 * header + pages.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MeProvider>
      <div className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </MeProvider>
  );
}
