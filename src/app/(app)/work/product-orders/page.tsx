import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { PRODUCT_STAGES, productOrderRows } from "@/lib/work-app";
import { AppCrumb, AlsoIn, StageChips } from "@/components/home/AppNav";
import { BTN_OUT } from "@/components/hire/HireUI";

export const metadata = { title: "Product Orders · Work · Panameer" };

// WA-E001: Work › Product Orders — buyers who ordered your Service Products in Shop, through delivery.
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const { stage: raw } = await searchParams;
  const rows = await productOrderRows(me.id);
  const stage = PRODUCT_STAGES.find((s) => s === raw) ?? "all";
  const list = stage === "all" ? rows : rows.filter((r) => r.stage === stage);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-work-product-orders>
      <AppCrumb app="Work" href="/work/home" page="Product Orders" />
      <h1 className="text-[28px] font-extrabold">Product Orders</h1>
      <div className="mt-4"><StageChips base="/work/product-orders" current={stage} stages={[["all", "All", rows.length], ...PRODUCT_STAGES.map((s) => [s, s, rows.filter((r) => r.stage === s).length] as [string, string, number])]} /></div>
      <ul className="divide-y divide-line border-y border-line">
        {list.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-3 py-3" data-product-order={r.stage}>
            <span className="min-w-0 flex-1"><Link href={r.href} className="block truncate text-[15px] font-bold hover:underline">{r.what}</Link><span className="text-[12.5px] text-ink-2">{r.buyer}</span></span>
            <span className="text-[13px] tabular-nums">{r.amount}</span>
            <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11.5px] font-bold">{r.stage}</span>
            <Link href={r.href} className={BTN_OUT}>{r.stage === "To Accept" ? "Review" : "Open"}</Link>
          </li>
        ))}
        {!list.length && <li className="py-6 text-[14px] text-ink-3">Nothing at this stage.</li>}
      </ul>
      <AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Estimates", "/work/estimates"], ["Catalog", "/catalog"]]} />
    </div>
  );
}
