import Link from "next/link";
import { FreeLine } from "@/components/marketing/FreeLine";
import { ComingSoon } from "@/components/ComingSoon";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { canProvideServices } from "@/lib/access";

export const metadata = { title: "Search Service Products · Panameer" };

export default async function Page() {
  const viewer = await memberOrPublicTwin("/shop");

  return (
    <div className="mx-auto w-full max-w-5xl">
      {}
      {canProvideServices(viewer) && (
        <nav aria-label="Selling" className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/my-services"
            className="inline-flex min-h-11 items-center rounded-brand border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
          >
            Sell Your Services
          </Link>
        </nav>
      )}

      <FreeLine claim="List the services you sell, free." />
      <ComingSoon title="Search Service Products" />
    </div>
  );
}
