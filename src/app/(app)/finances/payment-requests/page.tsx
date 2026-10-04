import { permanentRedirect } from "next/navigation";

export default function RetiredPaymentRequestsRoute() {
  permanentRedirect("/payments/payment-requests");
}
