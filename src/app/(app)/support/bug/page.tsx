import { guardPage } from "@/lib/guard";
import { BugReportForm } from "@/components/casing/BugReportForm";
import { canProvideServices } from "@/lib/access";
import { supportApplicationsFor } from "@/lib/support-applications";
import { PROVIDER_ROAD } from "@/lib/user-levels";

export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const viewer = await guardPage("authenticated");
  // RD-E006: Ask Us from /help/road — the ticket arrives tagged with the road stop.
  const { step } = await searchParams;
  const i = PROVIDER_ROAD.findIndex((s) => s.key === step);
  const initial = i >= 0 ? { title: `Question about stop ${i + 1}: ${PROVIDER_ROAD[i].step}`, application: "onboarding", howFound: `Road FAQ · ${PROVIDER_ROAD[i].key}` } : undefined;
  return (
    <BugReportForm applications={supportApplicationsFor(canProvideServices(viewer))} initial={initial} />
  );
}
