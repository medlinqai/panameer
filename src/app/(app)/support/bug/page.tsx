import { guardPage } from "@/lib/guard";
import { BugReportForm } from "@/components/casing/BugReportForm";
import { canProvideServices } from "@/lib/access";
import { supportApplicationsFor } from "@/lib/support-applications";

export default async function Page() {
  const viewer = await guardPage("authenticated");
  return (
    <BugReportForm applications={supportApplicationsFor(canProvideServices(viewer))} />
  );
}
