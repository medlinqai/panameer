import { SETTLEMENT_FLOW } from "@/lib/marketing-scenes";
import { FlowScene } from "@/components/marketing-home/scenes/FlowDiagram";

export function SettlementScene() {
  return (
    <FlowScene
      title="Service Procurement — Settlement"
      sub="Buyer to provider. From work delivered to money moved."
      spec={SETTLEMENT_FLOW}
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
