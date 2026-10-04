import { permanentRedirect } from "next/navigation";

export default async function RetiredPaymentRequestRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/payments/payment-requests/${id}`);
}
