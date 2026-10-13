import { permanentRedirect } from "next/navigation";

// MO-E004: offers live on My Catalog › Estimates.
export default function Page() {
  permanentRedirect("/catalog/estimates#offers");
}
