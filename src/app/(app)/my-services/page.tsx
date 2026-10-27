import { permanentRedirect } from "next/navigation";

// MC-E002: Service Products live under Catalog.
export default function Page() {
  permanentRedirect("/catalog/products");
}
