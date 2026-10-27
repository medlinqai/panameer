import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { offerRecommendation, RecommendationError } from "@/lib/recommendations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recommend · Panameer" };

// Scott 10-27: the buyer's "Recommend {seller}" after a Completed Order → the recommendation form.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  let url: string;
  try {
    url = await offerRecommendation(viewer, id);
  } catch (e) {
    if (!(e instanceof RecommendationError)) throw e;
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[15px]">{e.message}</p>
        <Link href="/worklist" className="mt-3 inline-block font-semibold underline">Back to Worklist</Link>
      </div>
    );
  }
  redirect(url);
}
