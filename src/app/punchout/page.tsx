import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";
import { currentPunchinId } from "@/lib/erp/punchin-live";

export const dynamic = "force-dynamic";
export const metadata = { title: "Punch-In · Panameer" };

// PI-E006: the bare punch-out product list is retired — a punch-in is a sign-in, so it shops in the real Shop.
export default async function PunchoutPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const sp = await searchParams;
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value);
  if (s?.connection.kind === "SETUP") redirect("/punchout/setup");
  if (!sp.expired && (s || (await currentPunchinId()))) redirect("/shop");
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-[24px] font-bold">This Punch-In Has Ended</h1>
      <p className="mt-2 text-[15px] text-ink-2">Start again from your ERP requisition to shop Panameer.</p>
    </main>
  );
}
