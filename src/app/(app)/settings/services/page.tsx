import { guardPage } from "@/lib/guard";
import { listProviderServices } from "@/lib/provider-services";
import { ProviderServices } from "@/components/settings/ProviderServices";

export const metadata = { title: "Services & Billing Terms · Panameer" };

export default async function ServicesPage() {
  const viewer = await guardPage("canProvideServices");
  const services = await listProviderServices(viewer).catch(() => []);
  return <ProviderServices initial={services} />;
}
