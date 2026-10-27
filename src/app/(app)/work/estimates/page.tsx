import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { todoGroups } from "@/lib/todo";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";
import { AppCrumb, AlsoIn } from "@/components/home/AppNav";

export const metadata = { title: "Estimates · Work · Panameer" };
export const dynamic = "force-dynamic";

// WK-E003: Work › Estimates (was Catalog › Estimates).
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const { stage } = await searchParams;
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  const actions = me ? await todoGroups(me.id, "provider") : [];
  return (
    <>
      <EstimatesBody viewer={viewer} side="seller" stage={["asked", "sent", "accepted", "expired"].includes(stage ?? "") ? stage : undefined} actions={actions} tabs={<AppCrumb app="Work" href="/work/home" page="Estimates" />} />
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6"><AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Product Orders", "/work/product-orders"], ["Catalog", "/catalog"]]} /></div>
    </>
  );
}
