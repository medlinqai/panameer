import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ShopHero } from "@/components/marketing/ShopHero";
import { ShopSpine } from "@/components/marketing/ShopSpine";

export const metadata: Metadata = {
  title: "Shop — Panameer",
  description:
    "Productized services on Panameer — a fixed scope, a fixed price, a named expert.",
};

export default function BuyServicesPage() {
  return (
    <MarketingShell>
      <ShopHero />
      {}
      <ShopSpine />
      {}
    </MarketingShell>
  );
}
