import { redirect } from "next/navigation";
/** Retired — Talent folded into Buyers/Sellers under Configuration Data. */
export default function Page() {
  redirect("/admin/buyers-sellers");
}
