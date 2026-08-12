/**
 * Testimonials (brief §8) — built as-is.
 *
 * ⚠ THESE PEOPLE DO NOT EXIST. Dr. Michelle Carter, Dr. Sarah Reynolds, Dr.
 * James Tran and Dr. Rachel Kim are StratERP-era placeholder personas with
 * invented metrics, and the brief says to port them unchanged for now.
 *
 * That makes this the highest-risk section on the page: a fabricated customer
 * quote with a name and a number attached is not placeholder copy in the way a
 * headline is — it is a testimonial, and a reader has no way to tell. Flagged
 * in the report; must be replaced or removed before `/` is public.
 */
export function Testimonials() {
  return (
    <>
      {/* TESTIMONIALS */}
      <section className="block">
        <div className="wrap">
          <div className="center">
            <div className="eyebrow">Testimonials</div>
            <h2>Don&rsquo;t take our word for it,<br />listen to our customers</h2>
          </div>
          <div className="tgrid">
            <div className="tcard">
              <span className="tag a">Dentistry</span>
              <span className="quote">&quot;</span>
              <p>Panameer transformed our procurement process. We reduced maverick spend by 31% in the first quarter and our supply invoices now match automatically — our front office team got hours back every week.</p>
              <div className="tperson"><span className="tav" style={{ background: 'var(--mag)' }}>DM</span><div><b>Dr. Michelle Carter</b><span>Practice Owner, Bright Smile Dental</span></div></div>
            </div>
            <div className="tcard">
              <span className="tag b">Dermatology</span>
              <span className="quote">&quot;</span>
              <p>Our revenue cycle used to be a black box. With Panameer&rsquo;s AI Maturity Dashboard we can see exactly where claims are getting denied and why. Collections lag dropped from 9 days to just over 5 in two months.</p>
              <div className="tperson"><span className="tav" style={{ background: 'var(--pink)' }}>SR</span><div><b>Dr. Sarah Reynolds</b><span>Medical Director, ClearSkin Dermatology</span></div></div>
            </div>
            <div className="tcard">
              <span className="tag c">Orthodontics</span>
              <span className="quote">&quot;</span>
              <p>Managing long treatment plan billing across three locations was a nightmare. Panameer&rsquo;s O2C framework automated our payment plan tracking and cut claim rejections by 28%. I wish we&rsquo;d done this years ago.</p>
              <div className="tperson"><span className="tav" style={{ background: 'var(--mag)' }}>JT</span><div><b>Dr. James Tran</b><span>Founder, Align Orthodontics</span></div></div>
            </div>
            <div className="tcard">
              <span className="tag d">Periodontics</span>
              <span className="quote">&quot;</span>
              <p>As a referral-based practice, we had zero visibility into our referral source ROI. Panameer built us a dashboard that tracks every referral through to collected revenue. Our surgical suite utilization went up.</p>
              <div className="tperson"><span className="tav" style={{ background: 'var(--green)' }}>RK</span><div><b>Dr. Rachel Kim</b><span>Owner, Summit Periodontics</span></div></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
