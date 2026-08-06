import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * Search Packages — a titled placeholder the requester rail can land on (WS-A).
 *
 * The rail names this destination, so it has to exist: a 404 out of your own
 * navigation reads as a broken product, where a titled empty state reads as one
 * that has not got there yet — which is the truth. The route, its title and its
 * capability gate are real; only the content is pending.
 */
export const metadata = { title: "Search Packages · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  return <ComingSoon title="Search Packages" />;
}
