import { SETTLEMENT_FLOW } from "@/lib/marketing-scenes";
import { FlowScene } from "@/components/marketing-home/scenes/FlowDiagram";

/**
 * SCENE 6 — Service Procurement, Settlement.
 *
 * ⚠ "NO INVOICE TO CHASE" IS THE WHOLE POINT, and what makes it readable is what
 * the diagram LEAVES OUT: there is no provider invoice chip, because the provider
 * never sends one. Approved settlement writes the receipt, the receipt triggers
 * evaluated-receipt settlement, and the payment lands. Anyone who has run
 * accounts payable sees that immediately; without the closing note it looks like
 * an ordinary three-way match.
 *
 * Content and topology are unchanged from the swimlane version this replaces —
 * only the form. The paragraph below is verbatim from that version.
 */
export function SettlementScene() {
  return (
    <FlowScene
      title="Service Procurement — Settlement"
      sub="Requester to provider. From work delivered to money moved."
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
