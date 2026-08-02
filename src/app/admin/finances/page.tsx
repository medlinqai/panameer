import { redirect } from "next/navigation";
/** Retired — Finances split into Settlements and Payments. */
export default function Page() {
  redirect("/admin/payments");
}
