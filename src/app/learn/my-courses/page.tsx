import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";

export default async function Page() {
  await guardPage("authenticated");
  redirect("/learn/paths?tab=mine");
}
