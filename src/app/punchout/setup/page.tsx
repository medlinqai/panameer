import { cookies } from "next/headers";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";
import { setupPrefill } from "@/lib/erp/setup-create";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set Up Panameer" };

// ES-E003: Set Up Panameer — reached from a punch-in with the public setup credential; prefilled from the cXML.
export default async function Page() {
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value);
  if (!s || s.connection.kind !== "SETUP") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-[24px] font-bold">Start Setup From Your ERP</h1>
        <p className="mt-2 text-[15px] text-ink-2">Punch in once with the Panameer setup credential to begin. The values are on <a href="/erp/connect" className="font-semibold underline">Connect Your ERP</a>.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">ORACLE CLOUD · SETUP</p>
      <h1 className="mt-1 text-[28px] font-extrabold">Set Up Panameer</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">Create your company on Panameer. You become its admin, and we give you your own punchout Identity and Password to replace the setup credential in Oracle.</p>
      <SetupForm initial={setupPrefill(s)} />
    </main>
  );
}
