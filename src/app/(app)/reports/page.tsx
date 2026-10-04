import { redirect } from "next/navigation";

// Not in R1: the stub is retired and the old address goes to the live page.
export default function Page() {
  redirect("/usage");
}
