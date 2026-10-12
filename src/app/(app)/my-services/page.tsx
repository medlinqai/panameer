import { permanentRedirect } from "next/navigation";

// MC-E002: Service Products live under My Catalog.
export default function Page() {
  permanentRedirect("/catalog/products");
}
