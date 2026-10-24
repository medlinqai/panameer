export const metadata = { title: "Connection Paused · Panameer" };

// EO-E005: a suspended ERP connection's punch-in lands here.
export default async function Page({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const reason = (await searchParams).reason;
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-[26px] font-extrabold">{reason ? "We Couldn't Sign You In" : "Your Company's Panameer Connection Is Paused"}</h1>
      <p className="mt-3 text-[15px] text-ink-2">{reason ?? "Shopping from your ERP is switched off for now."} Contact your admin, or email support@panameer.com.</p>
    </main>
  );
}
