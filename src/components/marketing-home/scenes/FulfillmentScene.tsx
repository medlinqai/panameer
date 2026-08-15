import { FULFILLMENT_LANES } from "@/lib/marketing-scenes";
import { SwimlaneFlow } from "@/components/marketing-home/scenes/SwimlaneFlow";

/**
 * SCENE 5 — Service Procurement, Fulfillment.
 *
 * ⚠ THE CLOSING NOTE IS THE ARGUMENT, NOT A CAPTION. Eight lanes look like a
 * lot of process until you count what the BUYER does: raise a requisition, then
 * accept a rate. Two actions. Everything between them is the integration, and
 * every Oracle document still exists in Oracle exactly as it would for any
 * other purchase. Cutting this paragraph for space would leave a diagram that
 * reads as complexity we are adding rather than complexity we are removing.
 */
export function FulfillmentScene() {
  return (
    <SwimlaneFlow
      title="Service Procurement — Fulfillment"
      sub="Requester to provider. Every hand-off, and which system it happens in."
      lanes={FULFILLMENT_LANES}
      note={
        <>
          <b>What the buyer does:</b> raise a requisition, then accept a rate.
          Everything between those two actions is the integration doing the work
          — and the requisition, agreement, PO and acknowledgement all
          exist in Oracle exactly as they would for any other purchase.
        </>
      }
    />
  );
}
