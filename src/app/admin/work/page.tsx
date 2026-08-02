import { redirect } from "next/navigation";
/** Retired by the revised rail — Work split into Requests/Orders/Packages. */
export default function Page() {
  redirect("/admin/work-requests");
}
