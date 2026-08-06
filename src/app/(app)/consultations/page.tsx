import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * Book a consultation — a titled placeholder (brief_requester_home_v1 WS-B).
 *
 * 1:1 booking is master Phase 4 (invite → propose → negotiate). The requester
 * home offers "Book a consultation" on every expert card, so the button has to
 * land somewhere honest rather than opening a scheduler that does not exist.
 */
export const metadata = { title: "Book a Consultation · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Book a Consultation" />;
}
