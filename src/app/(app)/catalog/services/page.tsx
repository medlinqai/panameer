import { redirect } from "next/navigation";

// WK-E003: Services is a section of My Catalog now.
export default function Page() {
  redirect("/catalog#services");
}
