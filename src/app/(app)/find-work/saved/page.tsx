import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

export default async function Page() {
  await guardPage("canProvideServices");
  redirect("/find-work?tab=saved");
}
