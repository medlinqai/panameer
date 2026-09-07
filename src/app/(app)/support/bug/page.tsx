import { guardPage } from "@/lib/guard";
import { BugReportForm } from "@/components/casing/BugReportForm";
import { canProvideServices } from "@/lib/access";
import { supportApplicationsFor } from "@/lib/support-applications";

/**
 * Report a bug (`P2-J1.1-E032`).
 *
 * ⚠ SUPERSEDED, quoted not deleted: *"UI ported from Medlinq's BugReportButton,
 * TARGET STUBBED per the brief (no ticketing backend)."* The backend landed —
 * `POST /api/support/tickets` — and the form now files a real ticket.
 *
 * ⚠⚠ THE OPTIONS ARE RESOLVED HERE, ON THE SERVER, AND PASSED DOWN. The list
 * depends on the reporter's own rail (`WS-2`), and the capability that decides
 * which rail lives in the session — a client component would have to fetch it.
 */
export default async function Page() {
  const viewer = await guardPage("authenticated");
  return (
    <BugReportForm applications={supportApplicationsFor(canProvideServices(viewer))} />
  );
}
