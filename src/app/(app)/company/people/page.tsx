import { redirect } from "next/navigation";

// Old URL; the page is Company › Team.
export default function Page() {
  redirect("/company/team");
}
