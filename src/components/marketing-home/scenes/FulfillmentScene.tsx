import { FULFILLMENT_FLOW } from "@/lib/marketing-scenes";
import { FlowScene } from "@/components/marketing-home/scenes/FlowDiagram";

export function FulfillmentScene() {
  return (
    <FlowScene
      title="Service Procurement — Fulfillment"
      sub="Buyer to provider. Every hand-off, and which system it happens in."
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
