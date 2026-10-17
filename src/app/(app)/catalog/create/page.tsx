import { guardPage } from "@/lib/guard";
import { CreateWhatYouSell } from "@/components/catalog/CreateWhatYouSell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create What You Sell · Panameer" };

// CWS-E002: Create What You Sell, inside the app casing (top nav and menu show). Three stops (RF-E006): Your Services · Your Service Products · Enable.
export default async function Page() {
  await guardPage("canProvideServices");
  return <div className="pm-white-page px-0 pb-14"><CreateWhatYouSell /></div>;
}
