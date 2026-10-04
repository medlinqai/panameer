import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

export const metadata = { title: "Book a Consultation · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Book a Consultation" />;
}
