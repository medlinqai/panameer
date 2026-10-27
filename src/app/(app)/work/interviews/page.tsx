import { redirect } from "next/navigation";

// WA-E001: Interviews & Tests are stages inside Jobs for You now.
export default function Page() {
  redirect("/work/jobs?stage=You%20Interviewed");
}
