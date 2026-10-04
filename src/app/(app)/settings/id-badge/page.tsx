import { redirect } from "next/navigation";

export default function RetiredSettingsRoute() {
  redirect("/settings/identity");
}
