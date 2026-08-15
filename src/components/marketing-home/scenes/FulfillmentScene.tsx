import { FULFILLMENT_FLOW } from "@/lib/marketing-scenes";
import { FlowScene } from "@/components/marketing-home/scenes/FlowDiagram";

/**
 * SCENE 5 — Service Procurement, Fulfillment.
 *
 * ⚠ THE CLOSING NOTE IS THE ARGUMENT, NOT A CAPTION. Four columns and a dozen
 * arrows look like a lot of process until you count what the BUYER does: raise a
 * requisition, then accept a rate. Two actions. Everything between them is the
 * integration, and every Oracle document still exists in Oracle exactly as it
 * would for any other purchase. Cutting this paragraph for space would leave a
 * diagram that reads as complexity we are adding rather than removing.
 *
 * Content and topology are unchanged from the swimlane version this replaces —
 * only the form. The paragraph below is verbatim from that version.
 */
export function FulfillmentScene() {
  return (
    <FlowScene
      title="Service Procurement — Fulfillment"
      sub="Requester to provider. Every hand-off, and which system it happens in."
      spec={FULFILLMENT_FLOW}
      note={
        <>
          <b>What the buyer does:</b> raise a requisition, then accept a rate.
          Everything between those two actions is the integration doing the work
          — and the requisition, agreement, PO and acknowledgement all exist in
          Oracle exactly as they would for any other purchase.
        </>
      }
    />
  );
}
