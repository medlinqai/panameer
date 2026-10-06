import { prisma } from "@/lib/prisma";

export const STUB_INTEGRATIONS = 0;

export const STUB_SERVICE_PRODUCT_REQUESTS = 0;

export const INTEGRATION_METHODS = ["cXML", "APIs", "email"] as const;

export const INTEGRATE_SUB =
  "Integrate seamlessly with Panameer’s AI Platform in minutes using mature technologies like cXML, APIs, and email";

export type IntegrateStat = {
  value: string;
  label: string;
  stub: boolean;
};

const plural = (n: number, singular: string) =>
  n === 1 ? singular : `${singular}s`;

/** BUILD-TIME READ. Reading the database in a server component does not make a */
export async function integrateHeroStats(): Promise<IntegrateStat[]> {
  /* THE ONLY LIVE QUERY IN THIS FUNCTION. */
  const serviceWorkRequests = await prisma.workRequest.count();

  return [
    {
      value: String(STUB_INTEGRATIONS),
      label: plural(STUB_INTEGRATIONS, "Integration"),
      stub: true,
    },
    {
      value: String(serviceWorkRequests),
      label: plural(serviceWorkRequests, "Service Work Request"),
      stub: false,
    },
    {
      value: String(STUB_SERVICE_PRODUCT_REQUESTS),
      label: plural(
        STUB_SERVICE_PRODUCT_REQUESTS,
        "Service Product Work Request",
      ),
      stub: true,
    },
  ];
}
