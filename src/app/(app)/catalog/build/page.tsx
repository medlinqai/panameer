import { permanentRedirect } from "next/navigation";

// MC-E002: Build Your Catalog is My Catalog › Services.
export default function Page() {
  permanentRedirect("/catalog/services");
}
