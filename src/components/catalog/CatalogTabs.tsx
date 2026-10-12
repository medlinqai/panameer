import { PageTabs } from "@/components/casing/PageTabs";

// MC-E002: the My Catalog area tabs (profile-page style).
export type CatalogTab = "home" | "services" | "products" | "estimates";
const TABS = [
  { label: "Home", href: "/catalog", match: "home" },
  { label: "Services", href: "/catalog/services", match: "services" },
  { label: "Service Products", href: "/catalog/products", match: "products" },
  { label: "Cost Estimates", href: "/catalog/estimates", match: "estimates" },
];

export function CatalogTabs({ current }: { current: CatalogTab }) {
  return <PageTabs wrap eyebrow="My Catalog" tabs={TABS} current={current} />;
}
