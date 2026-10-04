import { redirect } from "next/navigation";

// Company teams are R2; the old address goes to the company page.
export default function Page() {
  redirect("/company");
}
