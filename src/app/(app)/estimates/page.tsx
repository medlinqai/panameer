import { guardPage } from "@/lib/guard";
import Link from "next/link";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";
import { canProvideServices } from "@/lib/access";
import { redirect } from "next/navigation";

export const metadata = { title: "Estimates · Panameer" };
export const dynamic = "force-dynamic";

// My Estimates = the buyer side (Scott 2026-10-12). Sellers' sent estimates live in Catalog › Estimates; old ?tab=sent links go there.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await guardPage("authenticated");
  const seller = canProvideServices(viewer);
  if ((await searchParams).tab === "sent" && seller) redirect("/catalog/estimates");
  return <EstimatesBody viewer={viewer} side="buyer" seller={seller} tabs={<p className="mt-2 text-[13px] font-semibold"><Link href="/orders" className="text-magenta-dark">← Orders</Link></p>} />;
}
