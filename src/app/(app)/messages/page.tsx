import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Messages" />;
}
