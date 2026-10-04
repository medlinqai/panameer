import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

export default async function ConnectPage() {
  await guardPage("authenticated");
  redirect("/community");
}
