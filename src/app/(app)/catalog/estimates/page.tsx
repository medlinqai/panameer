import { redirect } from "next/navigation";

// WK-E003: Estimates moved to Work › Estimates.
export default function Page() {
  redirect("/work/estimates");
}
