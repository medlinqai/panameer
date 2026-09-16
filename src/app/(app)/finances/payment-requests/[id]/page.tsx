import { permanentRedirect } from "next/navigation";

/**
 * Retired with its parent (`P1-ALL-E533`).
 *
 * ⚠ THE ID IS CARRIED THROUGH. `RaiseSettlement` pushed people straight to
 * `/finances/payment-requests/<id>` after raising one, so a redirect that
 * dropped the id would land them on a list instead of the thing they just made.
 */
export default async function RetiredPaymentRequestRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/payments/payment-requests/${id}`);
}
