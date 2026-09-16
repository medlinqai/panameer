import { permanentRedirect } from "next/navigation";

/** Retired with its parent — see `finances/page.tsx` (`P1-ALL-E533`). */
export default function RetiredPaymentRequestsRoute() {
  permanentRedirect("/payments/payment-requests");
}
