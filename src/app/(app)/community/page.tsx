import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/** Rail "Community" — stub (MASTER WS11; nav-only per the brief). */
export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Community" />;
}
