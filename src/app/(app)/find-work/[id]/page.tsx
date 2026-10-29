import { redirect } from "next/navigation";

// Scott 10-29: job detail lives at /work/jobs/{id}; the query (e.g. ?decline=1) carries over, the #anchor stays in the browser.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const q = new URLSearchParams(Object.entries(await searchParams).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v != null ? [[k, v]] : [])));
  redirect(`/work/jobs/${encodeURIComponent(id)}${q.size ? `?${q}` : ""}`);
}
