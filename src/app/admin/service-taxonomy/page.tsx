import { redirect } from "next/navigation";

// CH-E001: Service Taxonomy is the Category Hierarchy now.
export default function Page() {
  redirect("/admin/category-hierarchy");
}
