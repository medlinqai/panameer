import { redirect } from "next/navigation";

// SH2-E003: Shop is one page — old tab URLs land on /shop with their query.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (v == null ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x] as [string, string])))).toString();
  redirect(qs ? `/shop?${qs}` : "/shop");
}
