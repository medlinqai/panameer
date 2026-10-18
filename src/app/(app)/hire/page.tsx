import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { HireQuestionnaire } from "@/components/hire/HireQuestionnaire";
import { HOW_LONG, SIZES, shipTos } from "@/lib/hire-questionnaire";
import { SHOP_CATEGORY_NAMES } from "@/lib/shop-categories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire · Panameer" };

// SH2-E004: Hire is one page — the need first (5 steps), saved as a draft Job, then named matches and proposal requests.
export default async function Page() {
  const viewer = await guardPage("canHireTalent");
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold">Hire</h1>
          <p className="text-[14px] text-ink-2">Tell us what you need. We&apos;ll show you who fits, and you choose who sends a proposal.</p>
        </div>
        <Link href="/hire/jobs" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">My Jobs →</Link>
      </div>
      <HireQuestionnaire categories={SHOP_CATEGORY_NAMES} howLong={HOW_LONG} sizes={SIZES} shipTos={(await shipTos(viewer)).map((s) => ({ id: s.id, label: s.label }))} />
    </div>
  );
}
