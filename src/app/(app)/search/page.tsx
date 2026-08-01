import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/** Rail "Search" — stub (brief_provider_home_page_v2 WS2, out of scope). */
export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Search" />;
}
