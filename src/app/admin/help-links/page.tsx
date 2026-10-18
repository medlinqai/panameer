import { redirect } from "next/navigation";

// II-E001: Help Links are Informational Items now.
export default function Page() {
  redirect("/admin/informational-items");
}
