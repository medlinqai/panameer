import { guardPage } from "@/lib/guard";
import { EstimatesBody } from "@/components/catalog/EstimatesBody";
import { AppCrumb, AlsoIn } from "@/components/home/AppNav";

export const metadata = { title: "Estimates · Work · Panameer" };
export const dynamic = "force-dynamic";

// WK-E003: Work › Estimates (was My Catalog › Estimates).
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  return (
    <>
      <EstimatesBody viewer={viewer} side="seller" tabs={<AppCrumb app="Work" href="/work/home" page="Estimates" />} />
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6"><AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Interviews & Tests", "/work/interviews"], ["My Catalog", "/catalog"]]} /></div>
    </>
  );
}
