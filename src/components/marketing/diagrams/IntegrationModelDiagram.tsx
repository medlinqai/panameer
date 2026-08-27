import { DiagramShell } from "@/components/marketing/diagrams/diagram-shell";
import { DiagramLegend } from "@/components/marketing/diagrams/Legend";
import {
  T, MAG, GREY, PILL, ERP, ERP_EDGE, ERP_INNER, AIP, AIP_EDGE, AIP_INNER, PRO, PRO_EDGE,
} from "@/components/marketing/diagrams/diagram-tokens";

/**
 * THE PANAMEER INTEGRATION MODEL — `/integrate` spine step 2 (`P1-J0-E335`).
 *
 * Source of truth: `2. Claude Sub-Files/mockups/integration_model_2026-08-26.html`,
 * itself out of `Panameer_Integration_Model_SCW.pptx`.
 *
 * ⚠⚠ THE GEOMETRY IS SCOTT'S AND EVERY COORDINATE IS PORTED AS WRITTEN. Not one
 * box moved, not one gap "improved", not one lane re-laid-out. If something looks
 * off, it looks off in the PPT he edited by hand — CHANGE IT THERE, NOT HERE.
 *
 * ── ⚠ THE THREE THINGS THAT ARE NOT A STRAIGHT COPY, AND WHY ────────────────
 *
 *  1. ⚠⚠ THE MARKER IDS ARE NAMESPACED. Both mockups define `<marker id="m">` and
 *     `<marker id="g">`, and BOTH DIAGRAMS NOW RENDER ON ONE PAGE — shipping them
 *     as written would put four duplicate ids in one document and let one
 *     diagram's arrowheads resolve against the other's defs. `im-*` here,
 *     `eh-*` in `EHubbingDiagram`.
 *  2. The mockup's page chrome — its `eyebrow`, `<h1>` and `.sub` — IS NOT SHIPPED.
 *     The panel this lands in already renders `Step 2 - Punch Out for Talent &
 *     Services` as its eyebrow and the step description as its `<h2>`; adding the
 *     mockup's own heading would stack three headings. The BOARD and the LEGEND are
 *     the diagram. ⚠ REPORTED, not silent.
 *  3. ⚠ THE `<p class="note">` IS A CHAT NOTE AND IS NOT PAGE COPY. Not shipped, by
 *     instruction. Its content is in the brief report's pre-launch list instead.
 *
 * ── ⚠⚠ WHAT THIS DIAGRAM CLAIMS THAT DOES NOT EXIST ─────────────────────────
 *
 * Of the objects drawn, ONLY `Work Request` and the Service Product Catalog
 * (`Package`) are in the schema. `Work Order`, `Settlement Request`, `Payment`,
 * `Invoice`, `Receipts`, `Time Sheet` and `Receivables` DO NOT EXIST, and neither
 * does any punchout endpoint or cXML rail. ⚠ `decisions-01.md` records `0 of 5
 * built, knowingly` and outstanding parts gate PROMOTION not the build — but A
 * DIAGRAM IS A STRONGER CLAIM THAN A STEP LABEL, so the full list is on the
 * pre-launch list. ⚠ DO NOT TREAT THIS PICTURE AS A SPEC OF WHAT IS SHIPPED.
 */
export function IntegrationModelDiagram() {
  return (
    <>
      <DiagramShell label="The Panameer integration model, scrollable">
        <svg
          viewBox="70 112 1110 590"
          role="img"
          aria-label="Panameer integration model across ERP, Panameer AIP and Panameer Provider"
          className="block h-auto w-full min-w-[1110px]"
        >
          <defs>
            <marker id="im-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10z" fill={MAG} />
            </marker>
            <marker id="im-grey" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10z" fill={GREY} />
            </marker>
          </defs>

          {/* ── ERP ────────────────────────────────────────────────────────── */}
          <text style={T.lane} x="85" y="163">ERP</text>
          <text style={T.lane} x="85" y="182">Application</text>
          <rect x="291.7" y="119.9" width="864" height="153" rx="12" fill={ERP} stroke={ERP_EDGE} strokeWidth="1.4" />
          <rect x="360.1" y="130.7" width="311.4" height="57.6" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="366" y="143">ORDER INITIATION, CREATION &amp; COMMUNICATION</text>
          <rect x="738.8" y="130.7" width="165.6" height="57.6" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="746" y="143">ORDER VERIFICATION</text>

          <rect x="295.3" y="152.3" width="57.6" height="23.4" rx="11" fill={MAG} />
          <text style={T.st} x="308" y="167">START</text>
          <rect x="382.8" y="148.7" width="77.4" height="34.2" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="399" y="170">Request</text>
          <rect x="471" y="148.7" width="77.4" height="34.2" rx="7" fill="#fff" stroke={ERP_EDGE} />
          <text style={T.n} x="486" y="170">Approve</text>
          <rect x="559.2" y="148.7" width="90" height="34.2" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="572" y="164">Purchase</text>
          <text style={T.n} x="583" y="177">Order</text>
          <ellipse cx="821.6" cy="166.7" rx="72" ry="18" fill="#fff" stroke={ERP_EDGE} />
          <text style={T.n} x="781" y="164">Order Validation</text>
          <text style={T.ns} x="791" y="176">2-way / 3-way</text>
          <line x1="355.4" y1="165.3" x2="378" y2="165.3" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />
          <line x1="462" y1="165.8" x2="467" y2="165.8" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />
          <line x1="550.2" y1="165.8" x2="555" y2="165.8" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />
          <line x1="651" y1="166.5" x2="746" y2="166.5" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />

          <rect x="639.1" y="195.5" width="100.8" height="52.2" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="646" y="207">ORDER RECEIPT</text>
          <rect x="646.3" y="213.5" width="86.4" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="665" y="231">Receipts</text>
          <rect x="757.9" y="195.5" width="365.5" height="52.2" rx="8" fill={ERP_INNER} stroke={ERP_EDGE} />
          <text style={T.cap} x="1000" y="207">ORDER SETTLEMENT</text>
          <rect x="797.3" y="213.5" width="86.4" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="817" y="231">Invoices</text>
          <rect x="894.7" y="213.5" width="99" height="27" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="913" y="231">Payments</text>
          <line x1="883.7" y1="227" x2="890" y2="227" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />
          <path d="M894 166.5 H 944 V 209" fill="none" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />
          <path d="M690 248 V 258 H 944 V 244" fill="none" stroke={GREY} strokeWidth="1.4" markerEnd="url(#im-grey)" />

          {/* ── PANAMEER AIP ───────────────────────────────────────────────── */}
          <text style={T.lane} x="85" y="395">Panameer</text>
          <text style={T.lane} x="85" y="414">AIP</text>
          <rect x="291.7" y="353.9" width="468" height="193.6" rx="12" fill={AIP} stroke={AIP_EDGE} strokeWidth="1.4" />
          <rect x="786.7" y="353.9" width="369" height="193.6" rx="12" fill={AIP} stroke={AIP_EDGE} strokeWidth="1.4" />
          <rect x="298.9" y="361.1" width="326.9" height="149.4" rx="10" fill={AIP_INNER} stroke={AIP_EDGE} />
          <rect x="306.1" y="368.3" width="270" height="37.8" rx="7" fill="#fff" stroke={AIP_EDGE} />
          <text style={T.n} x="404" y="392">Work Request</text>
          <rect x="306.1" y="453" width="135" height="41.4" rx="7" fill="#fff" stroke={AIP_EDGE} />
          <text style={T.n} x="329" y="470">Services</text>
          <text style={T.n} x="333" y="483">Catalog</text>
          <rect x="455.5" y="453" width="162" height="41.4" rx="7" fill="#fff" stroke={AIP_EDGE} />
          <text style={T.n} x="479" y="470">Service Product</text>
          <text style={T.n} x="509" y="483">Catalog</text>
          <rect x="524.8" y="518.1" width="101" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="533" y="531">SERVICES FULFILLMENT</text>
          <rect x="666.1" y="368.3" width="84.6" height="46.8" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="678" y="387">Work Order</text>
          <text style={T.ns} x="686" y="401">(aka SOW)</text>
          <rect x="797.5" y="368.3" width="113.4" height="46.8" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="820" y="387">Settlement</text>
          <text style={T.n} x="827" y="401">Request</text>
          <rect x="1038.7" y="368.3" width="99" height="37.8" rx="7" fill="#fff" stroke={MAG} />
          <text style={T.n} x="1064" y="392">Payment</text>
          <rect x="906.4" y="515.3" width="99" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="914" y="528">SERVICES SETTLEMENT</text>
          <line x1="366.4" y1="405.9" x2="366.4" y2="449" stroke={MAG} strokeWidth="2" markerEnd="url(#im-arrow)" />
          <line x1="534.1" y1="407" x2="534.1" y2="449" stroke={MAG} strokeWidth="2" markerEnd="url(#im-arrow)" />

          {/* ── PANAMEER PROVIDER ──────────────────────────────────────────── */}
          <text style={T.lane} x="85" y="608">Panameer</text>
          <text style={T.lane} x="85" y="627">Provider</text>
          <rect x="291.7" y="585.3" width="342" height="102.2" rx="12" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="660.7" y="585.3" width="495" height="102.2" rx="12" fill={PRO} stroke={PRO_EDGE} strokeWidth="1.4" />
          <rect x="302.5" y="596.1" width="135" height="46.8" rx="7" fill="#fff" stroke={PRO_EDGE} />
          <text style={T.n} x="325" y="615">Provider</text>
          <text style={T.n} x="327" y="629">Resume</text>
          <rect x="448.3" y="596.1" width="144" height="46.8" rx="7" fill="#fff" stroke={PRO_EDGE} />
          <text style={T.n} x="474" y="615">Provider</text>
          <text style={T.n} x="459" y="629">Re-Deployables</text>
          <rect x="671.5" y="596.1" width="126" height="46.8" rx="7" fill="#fff" stroke={PRO_EDGE} />
          <text style={T.n} x="700" y="615">Accept</text>
          <text style={T.n} x="690" y="629">Work Order</text>
          <rect x="815.5" y="596.1" width="99" height="46.8" rx="7" fill="#fff" stroke={PRO_EDGE} />
          <text style={T.n} x="846" y="615">Time</text>
          <text style={T.n} x="845" y="629">Sheet</text>
          <rect x="1011.7" y="596.1" width="126" height="46.8" rx="7" fill="#fff" stroke={PRO_EDGE} />
          <text style={T.n} x="1041" y="624">Receivables</text>
          <rect x="376.4" y="651.5" width="60" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="394" y="664.5">SALES</text>
          <rect x="851.7" y="651.5" width="92" height="19" rx="9" fill={PILL} />
          <text style={T.pl} x="861" y="664.5">ORDER-TO-CASH</text>

          {/* ── THE RAILS — every magenta line is a Panameer ↔ ERP hand-off ── */}
          <line x1="410.5" y1="184.7" x2="410.5" y2="364" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <text style={T.rl} x="339" y="292">PUNCHOUT</text>
          <text style={T.rl} x="339" y="303">SETUP</text>
          <text style={T.rl} x="339" y="314">REQUEST</text>
          <line x1="437.5" y1="364" x2="437.5" y2="184.7" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <text style={T.rl} x="448" y="296">RETURN</text>
          <text style={T.rl} x="448" y="307">CART</text>
          <path d="M604 183 V 300 H 708 V 364" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <text style={T.rl} x="595" y="313">PURCHASE ORDER</text>
          <path d="M854 364 V 316 H 690 V 244" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <text style={T.rl} x="739" y="313">SERVICE RECEIPT</text>
          <path d="M944 244 V 330 H 1088 V 364" fill="none" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <text style={T.rl} x="993" y="313">PAYMENT</text>
          <line x1="372.7" y1="592" x2="372.7" y2="498" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <line x1="521.2" y1="592" x2="521.2" y2="498" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <line x1="708.4" y1="592" x2="708.4" y2="419" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <line x1="858.7" y1="592" x2="858.7" y2="419" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
          <line x1="1088.2" y1="410" x2="1088.2" y2="592" stroke={MAG} strokeWidth="2.2" markerEnd="url(#im-arrow)" />
        </svg>
      </DiagramShell>
      <DiagramLegend third="Panameer Provider" />
    </>
  );
}
