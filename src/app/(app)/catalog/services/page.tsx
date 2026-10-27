import { redirect } from "next/navigation";

// WK-E003: Services is a section of Catalog now.
export default function Page() {
  redirect("/catalog#services");
}
