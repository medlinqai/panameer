import { onboardingFor } from "@/lib/erp/self-onboard-notify";
import { ConfirmCompanyForm } from "./ConfirmCompanyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm Your Company · Panameer" };

// EO-E004: the first requester of a self-connected ERP confirms the company and sets a password.
export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? "";
  const ob = t ? await onboardingFor(t) : null;
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-[26px] font-extrabold">Confirm Your Company &amp; Set a Password</h1>
      {ob ? (
        <>
          <p className="mt-2 text-[14.5px] text-ink-2">Your Oracle Cloud is already connected — you can shop from it now. Confirming lets you sign in on the web as <b>{ob.person.user!.email}</b>, add colleagues and appoint another admin.</p>
          <ConfirmCompanyForm token={t} companyName={ob.person.company!.name} />
        </>
      ) : <p className="mt-3 text-[15px] text-ink-2">This link has expired or was already used. <a href="/forgot-password" className="font-semibold underline">Reset your password</a> to sign in, or email support@panameer.com.</p>}
    </main>
  );
}
