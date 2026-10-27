import { permanentRedirect } from "next/navigation";

// MC-E002: Build Your Catalog is Catalog › Services.
export default function Page() {
  permanentRedirect("/catalog/services");
}
