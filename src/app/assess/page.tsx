import type { Metadata } from "next";
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard";
import { getSpecializations } from "@/lib/catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Where Can AI Help My Business? — Panameer",
  description:
    "A free AI maturity assessment. Answer for one process in about eight minutes and get a report sized in your own dollars.",
};

export default async function AssessPage() {
  const groups = await getSpecializations();
  const industries = (groups.find((g) => g.kind === "INDUSTRY")?.items ?? [])
    .map((i) => ({ id: i.id, name: i.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <AssessmentWizard industries={industries} />;
}
