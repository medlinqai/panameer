import type { ReactNode } from "react";

// WK-E003: Catalog is one page in Work — no tab row.
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
