import { notFound, redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RequestEstimateForm } from "@/components/catalog/RequestEstimateForm";

export const metadata = { title: "Request an Estimate · Panameer" };
export const dynamic = "force-dynamic";

// EST-E001: ask a provider for a cost estimate — pre-filled with the service or product it came from.
export default async function Page({ searchParams }: { searchParams: Promise<{ provider?: string; service?: string; product?: string }> }) {
  const sp = await searchParams;
  const viewer = await getSessionViewer();
  if (!viewer) {
    const back = `/estimates/request?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }
  if (!sp.provider) notFound();
  const provider = await prisma.person.findUnique({ where: { id: sp.provider }, select: { id: true, user_id: true, first_name: true, last_name: true, providerProfile: { select: { id: true } } } });
  if (!provider?.providerProfile) notFound();
  const [svc, prod] = await Promise.all([
    sp.service ? prisma.providerService.findFirst({ where: { id: sp.service, provider_profile_id: provider.providerProfile.id }, select: { id: true, name: true } }) : null,
    sp.product ? prisma.serviceProduct.findFirst({ where: { id: sp.product, provider_profile_id: provider.providerProfile.id }, select: { id: true, title: true } }) : null,
  ]);
  const self = provider.user_id === viewer.userId;
  const name = [provider.first_name, provider.last_name].filter(Boolean).join(" ");
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-[28px] font-bold">Request an Estimate</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">From <b className="text-ink">{name}</b>{svc ? <> · for <b className="text-ink">{svc.name}</b></> : prod ? <> · for <b className="text-ink">{prod.title}</b></> : null}. Only you and {provider.first_name ?? "the provider"} see it.</p>
      {self ? (
        <p className="mt-6 text-[14px] text-ink-2">This is your own profile, so there&apos;s no one to ask.</p>
      ) : (
        <RequestEstimateForm providerPersonId={provider.id} serviceId={svc?.id ?? null} serviceProductId={prod?.id ?? null} prefill={svc ? `I'd like an estimate for ${svc.name}.` : prod ? `I'd like an estimate for ${prod.title}.` : ""} />
      )}
    </main>
  );
}
