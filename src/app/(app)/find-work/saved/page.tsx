import { redirect } from "next/navigation";

export default function Page() {
  redirect("/work/jobs?kind=interested");
}
