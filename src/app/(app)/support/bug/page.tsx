import { guardPage } from "@/lib/guard";
import { BugReportForm } from "@/components/casing/BugReportForm";

/**
 * Report a bug (MASTER WS10 element 6) — UI ported from Medlinq's
 * BugReportButton, TARGET STUBBED per the brief (no ticketing backend).
 */
export default async function Page() {
  await guardPage("authenticated");
  return <BugReportForm />;
}
