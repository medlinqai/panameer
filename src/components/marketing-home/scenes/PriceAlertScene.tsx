/**
 * SCENE 2 — the price-alert email, as a prospect would receive it.
 *
 * An EMAIL rather than an in-app screen, deliberately: the alert's whole claim
 * is that it reaches a requester before approval, wherever they are.
 *
 * ⚠ THE CLOSING "WHY YOU GOT THIS" PARAGRAPH IS NOT PADDING. It names the
 * threshold that fired the alert and says the write-back leaves the approval
 * chain unchanged — that is what makes this read as a system rather than a
 * coupon. Do not cut it for space.
 *
 * The buttons are <span>s, not <button>s: this is a picture of an email, and a
 * real button here would be a control that does nothing.
 */
export function PriceAlertScene() {
  return (
    <div className="mail">
      <div className="mailhdr">
        <div className="lg"><i>P</i>Panameer</div>
        <span className="tag">PRICE ALERT</span>
      </div>
      <div className="mailbody">
        <h2>A lower price is available on this line</h2>
        <div className="meta">
          To Dana Whitfield · Requisition <b>REQ-104872</b> · Oracle Cloud Procurement · 14 Aug 2026, 9:12 AM
        </div>
        <p>
          Your requisition is still pending approval. Panameer checked line 2 against the GPO
          contracts your organization is entitled to and found a better price with an equal or
          shorter lead time.
        </p>

        <div className="reqbox">
          <div className="rh"><span>REQUISITION LINE 2 OF 4</span><span>Business unit · Clinical Operations</span></div>
          <div className="rl">
            <b>Nitrile Exam Gloves, Powder-Free, Large — case of 1,000</b>
            <br />
            <span className="dim">Item 41-8802-L · Quantity 40 CS · Need-by 22 Aug 2026</span>
          </div>
        </div>

        <div className="cmp">
          <div className="now">
            <div className="lab">On your requisition</div>
            <div className="sup">Midwest Medical Supply</div>
            <div className="px">$84.50 <span>/ case</span></div>
            <div className="ex">Spot price · no contract · 5-day lead time<br />Line total <b>$3,380.00</b></div>
          </div>
          <div className="gpo">
            <div className="lab">Panameer GPO contract</div>
            <div className="sup">McKesson Medical-Surgical</div>
            <div className="px">$71.20 <span>/ case</span></div>
            <div className="ex">Contract GPO-2291 · valid to 31 Mar 2027 · 3-day lead time<br />Line total <b>$2,848.00</b></div>
          </div>
        </div>

        <div className="save">
          <div>
            <div className="s1">Saving on this line if you switch</div>
            <div className="s3">15.7% below the price on the requisition</div>
          </div>
          <div className="s2">$532.00</div>
        </div>

        <div className="btns">
          <span className="mbtn p">Switch to the GPO Price</span>
          <span className="mbtn">Keep Current Supplier</span>
          <span className="mbtn">Open in Oracle Cloud</span>
        </div>

        <div className="whyb">
          <b>Why you got this.</b> Line 2 priced <b>18.7% above</b> the contracted benchmark for
          this item, over your organization’s 10% alert threshold. Switching writes the new
          supplier, price and contract reference back to the requisition in Oracle Cloud — no
          re-keying, and the approval chain is unchanged.
          <br />
          <br />
          <span className="faint">
            Panameer · price alerts run on every requisition line before approval. Manage
            thresholds in Settings → Alerts.
          </span>
        </div>
      </div>
    </div>
  );
}
