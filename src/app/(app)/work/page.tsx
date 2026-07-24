import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

export default async function Page() {
  await guardPage("canHireTalent");
  return <ComingSoon title="Manage Work" />;
}
