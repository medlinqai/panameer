import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/** Rail "Finances" — stub; the brief lists it as nav-only. */
export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Finances" />;
}
