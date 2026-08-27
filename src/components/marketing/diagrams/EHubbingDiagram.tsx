import { DiagramShell } from "@/components/marketing/diagrams/diagram-shell";
import { DiagramLegend } from "@/components/marketing/diagrams/Legend";
import {
  T, MAG, GREY, PILL, ERP, ERP_EDGE, ERP_INNER, AIP, AIP_EDGE, PRO, PRO_EDGE,
} from "@/components/marketing/diagrams/diagram-tokens";

/**
 * THE PANAMEER eHUBBING MODEL FOR GOODS PROCUREMENT — `/integrate` spine step 3
 * (`P1-J0-E335`).
 *
 * Source of truth: `2. Claude Sub-Files/mockups/ehubbing_model_2026-08-26.html`,
 * itself out of `Panameer_eHubbing_Model_SCW.pptx`.
 *
 * ⚠⚠ THE GEOMETRY IS SCOTT'S AND EVERY COORDINATE IS PORTED AS WRITTEN. Not one
 * box moved. ⚠ IT SHARES `diagram-tokens.ts` WITH `IntegrationModelDiagram` ON
 * PURPOSE — the brief: *"Both diagrams share one grid deliberately, so they read as
 * a pair. Keep it."* The ERP lane above is the SAME geometry in both, offset by
 * 14.4 units; that is not a copy-paste slip, it is the pair working.
 *
 * ⚠ MARKER IDS ARE `eh-*`, NOT the mockup's `m`/`g` — both diagrams render on one
 * page and the mockups both use the same two ids. See `IntegrationModelDiagram`.
 * ⚠ The mockup's `eyebrow`/`<h1>`/`.sub` are NOT shipped (the panel supplies its
 * own eyebrow and `<h2>`), and the `<p class="note">` is a CHAT NOTE, not page copy.
 *
 * ── ⚠⚠ NOTHING IN THIS DIAGRAM IS BUILT. NOT ONE OBJECT. ────────────────────
 *
 * No `Integration` model, no punchout endpoint, no cXML, no PO routing, no supplier
 * transmission, no `Remote Catalog`, no `Ship Goods`, no `Bill / Invoice`, no
 * `Payment`, and no supplier records of any kind. THIS IS THE GOODS SIDE AND THE
 * GOODS SIDE DOES NOT EXIST. ⚠ `decisions-01.md` records `0 of 5 built, knowingly`
 * and outstanding parts gate PROMOTION, not the build — but this is the single
 * strongest unbacked claim on the public site, and the whole object list is on the
 * pre-launch list. ⚠ DO NOT READ THIS AS A SPEC OF ANYTHING SHIPPED.
 */
export function EHubbingDiagram() {
  return (
    <>
      <DiagramShell label="The Panameer eHubbing model for goods procurement, scrollable">
        <svg
          viewBox="70 125 1110 520"
          role="img"
          aria-label="Panameer eHubbing model for goods procurement"
          className="block h-auto w-full min-w-[1110px]"
        >
          <defs>
            <marker id="eh-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10z" fill={MAG} />
            </marker>
            <marker id="eh-grey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10z" fill={GREY} />
            </marker>
          </defs>

          {/* ── ERP ────────────────────────────────────────────────────────── */}
          <text style={T.lane} x="85" y="177">ERP</text>
          <text style={T.lane} x="85" y="196">Application</text>
          <rect x="291.7" y="134.3" width="864" height="153" rx="12" fill={ERP} stroke={ERP_EDGE} strokeWidth="1.4" />
          <rect x="360.1" y="145.1" width="311.4" height="57.6" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="366" y="157">ORDER INITIATION, CREATION &amp; COMMUNICATION</text>
          <rect x="738.8" y="145.1" width="165.6" height="57.6" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="746" y="157">ORDER VERIFICATION</text>
          <rect x="295.3" y="166.7" width="57.6" height="23.4" rx="11" fill={MAG} />
          <text style={T.st} x="308" y="181">START</text>
          <rect x="382.8" y="163.1" width="77.4" height="34.2" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="399" y="184">Request</text>
          <rect x="471" y="163.1" width="77.4" height="34.2" rx="7" fill="#fff" stroke={ERP_EDGE} />
          <text style={T.n} x="486" y="184">Approve</text>
          <rect x="559.2" y="163.1" width="90" height="34.2" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="572" y="178">Purchase</text>
          <text style={T.n} x="583" y="191">Order</text>
          <ellipse cx="821.6" cy="181.1" rx="72" ry="18" fill="#fff" stroke={ERP_EDGE} />
          <text style={T.n} x="781" y="178">Order Validation</text>
          <text style={T.ns} x="791" y="190">2-way / 3-way</text>
          <line x1="355.4" y1="179.5" x2="378" y2="179.5" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <line x1="462" y1="180.2" x2="467" y2="180.2" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <line x1="550.2" y1="180.2" x2="555" y2="180.2" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <line x1="651" y1="180.5" x2="746" y2="180.5" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <rect x="639.1" y="209.9" width="100.8" height="52.2" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="646" y="221">ORDER RECEIPT</text>
          <rect x="646.3" y="227.9" width="86.4" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="665" y="245">Receipts</text>
          <rect x="757.9" y="209.9" width="365.5" height="52.2" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="1000" y="221">ORDER SETTLEMENT</text>
          <rect x="797.3" y="227.9" width="86.4" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="817" y="245">Invoices</text>
          <rect x="894.7" y="227.9" width="99" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="913" y="245">Payments</text>
          <path d="M894 181 H 944 V 223" fill="none" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <path d="M689.5 227.9 V 204.5 H 786 V 200.5" fill="none" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />
          <line x1="840.5" y1="227.9" x2="840.5" y2="200.5" stroke={GREY} strokeWidth="1.4" markerEnd="url(#eh-grey)" />

          {/* ── PANAMEER AIP ───────────────────────────────────────────────── */}
          <text style={T.lane} x="85" y="409">Panameer</text>
          <text style={T.lane} x="85" y="428">AIP</text>
          <rect x="291.7" y="368.3" width="468" height="127.9" rx="12" fill={AIP} stroke={AIP_EDGE} strokeWidth="1.4" />
          <rect x="786.7" y="368.3" width="369" height="127.9" rx="12" fill={AIP} stroke={AIP_EDGE} strokeWidth="1.4" />
          <rect x="359.4" y="398.5" width="103.5" height="41.4" rx="7" fill="#fff" stroke={AIP_EDGE} />
          <text style={T.n} x="379" y="415">Remote</text>
          <text style={T.n} x="380" y="428">Catalog</text>
          <rect x="483.7" y="398.5" width="101.4" height="42" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="492" y="415">Purchase Order</text>
          <text style={T.n} x="500" y="428">/ Sales Order</text>
          <rect x="627.1" y="398.5" width="77.4" height="42" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="647" y="415">Ship</text>
          <text style={T.n} x="643" y="428">Goods</text>
          <rect x="798.6" y="398.5" width="113.4" height="41.4" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="820" y="423">Bill / Invoice</text>
          <rect x="1038.7" y="398.5" width="99" height="37.8" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="1064" y="422">Payment</text>
          <rect x="524.8" y="468.1" width="98" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="536" y="481">GOODS FULFILLMENT</text>
          <rect x="906.4" y="465.3" width="94" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="915" y="478">GOODS SETTLEMENT</text>

          {/* ── ERP APPLICATION SUPPLIERS ──────────────────────────────────── */}
          <text style={T.lane} x="85" y="588">ERP Application</text>
          <text style={T.lane} x="85" y="607">Suppliers</text>
          <rect x="295.3" y="548.1" width="149.4" height="66.8" rx="10" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="468.1" y="548.1" width="149.4" height="66.8" rx="10" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="640.9" y="548.1" width="149.4" height="66.8" rx="10" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="814" y="548.1" width="149.4" height="66.8" rx="10" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="987.1" y="548.1" width="149.4" height="66.8" rx="10" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <text style={T.n} x="341" y="585">Supplier 1</text>
          <text style={T.n} x="514" y="585">Supplier 2</text>
          <text style={T.n} x="687" y="585">Supplier 3</text>
          <text style={T.n} x="860" y="585">Supplier 4</text>
          <text style={T.n} x="1033" y="585">Supplier 5</text>

          {/* ── THE RAILS ──────────────────────────────────────────────────── */}
          <line x1="410.5" y1="199.1" x2="410.5" y2="394" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <text style={T.rl} x="313" y="306">PUNCHOUT</text>
          <text style={T.rl} x="313" y="317">SETUP</text>
          <text style={T.rl} x="313" y="328">REQUEST</text>
          <line x1="437.5" y1="394" x2="437.5" y2="199.1" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <text style={T.rl} x="448" y="310">RETURN</text>
          <text style={T.rl} x="448" y="321">CART</text>
          <path d="M604 197.3 V 300 H 534 V 394" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <path d="M665 394 V 340 H 690 V 258" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <text style={T.rl} x="700" y="333">GOODS RECEIPT</text>
          <text style={T.rl} x="542" y="309">PURCHASE ORDER</text>
          <line x1="838" y1="394" x2="838" y2="258" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <text style={T.rl} x="844" y="309">INVOICE</text>
          <path d="M944 258 V 330 H 1088 V 394" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#eh-arrow)" />
          <text style={T.rl} x="993" y="309">PAYMENT</text>
          <line x1="371.6" y1="544" x2="371.6" y2="502" stroke={MAG} strokeWidth="2.2" markerStart="url(#eh-arrow)" markerEnd="url(#eh-arrow)" />
          <line x1="544.4" y1="544" x2="544.4" y2="502" stroke={MAG} strokeWidth="2.2" markerStart="url(#eh-arrow)" markerEnd="url(#eh-arrow)" />
          <line x1="717.2" y1="544" x2="717.2" y2="502" stroke={MAG} strokeWidth="2.2" markerStart="url(#eh-arrow)" markerEnd="url(#eh-arrow)" />
          <line x1="890.3" y1="544" x2="890.3" y2="502" stroke={MAG} strokeWidth="2.2" markerStart="url(#eh-arrow)" markerEnd="url(#eh-arrow)" />
          <line x1="1063.4" y1="544" x2="1063.4" y2="502" stroke={MAG} strokeWidth="2.2" markerStart="url(#eh-arrow)" markerEnd="url(#eh-arrow)" />
        </svg>
      </DiagramShell>
      <DiagramLegend third="ERP Application Suppliers" />
    </>
  );
}
