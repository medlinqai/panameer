import { redirect } from "next/navigation";

// HB-E008: Estimate Events live in the Estimate app now.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/estimate/${(await params).id}`);
}
