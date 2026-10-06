import { redirect } from "next/navigation";

// Old URL; the page is Admin › Users › Trend.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(`/admin/users/trend${qs ? `?${qs}` : ""}`);
}
