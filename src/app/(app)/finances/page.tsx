import { permanentRedirect } from "next/navigation";

export default function RetiredFinancesRoute() {
  permanentRedirect("/payments");
}
