import { redirect } from "next/navigation";

// HB-E008: Request an Estimate lives in the Estimate app now.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(`/estimate/new${qs ? `?${qs}` : ""}`);
}
