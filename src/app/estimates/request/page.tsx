import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";

export const dynamic = "force-dynamic";

// ES-E007: the one-off request now opens an Estimate Event with that provider (same pages); old requests stay readable.
export default async function Page({ searchParams }: { searchParams: Promise<{ provider?: string; service?: string; product?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  if (!(await getSessionViewer())) redirect(`/login?callbackUrl=${encodeURIComponent(`/shop/estimates/new${qs ? `?${qs}` : ""}`)}`);
  redirect(`/shop/estimates/new${qs ? `?${qs}` : ""}`);
}
