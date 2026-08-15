import { SETTLEMENT_LANES } from "@/lib/marketing-scenes";
import { SwimlaneFlow } from "@/components/marketing-home/scenes/SwimlaneFlow";

/**
 * SCENE 6 — Service Procurement, Settlement.
 *
 * ⚠ "NO INVOICE TO CHASE" IS THE WHOLE POINT. The five lanes are only
 * interesting because of what is missing from them: the provider never submits
 * an invoice. Approved settlement writes the receipt, the receipt triggers
 * evaluated-receipt settlement, and the payment lands. Anyone who has run
 * accounts payable reads that immediately; without the closing note it looks
 * like an ordinary three-way match.
 */
export function SettlementScene() {
  return (
    <SwimlaneFlow
      title="Service Procurement — Settlement"
      sub="Requester to provider. From work delivered to money moved."
      lanes={SETTLEMENT_LANES}
      note={
        <>
          <b>No invoice to chase.</b> Approved settlement creates the receipt,
          the receipt triggers evaluated-receipt settlement, and payment lands
          with the provider. The buyer approves once; the provider is paid
          without submitting an invoice at all.
        </>
      }
    />
  );
}
