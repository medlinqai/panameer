import { Btn } from "@/components/marketing/brand";
import { BRAND_MANIFESTO } from "@/lib/brand";

const POINTS = [
  "Post work in minutes — directly or through your ERP",
  "Invite vetted providers to bid instantly",
  "Order providers in seconds — no DocuSign, no contract round-trip",
  "Pay by hour, milestone, or draw-down",
];

export function Punchout() {
  return (
    <section id="punchout" className="pb-[76px] pt-5">
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="grid items-center gap-10 rounded-[22px] bg-[linear-gradient(115deg,#171E3E,#2a1c4a_60%,#5a1f5a)] p-[34px] text-white md:grid-cols-[1.1fr_.9fr] md:p-14">
          <div>
            <span className="mb-4 inline-block rounded-full border border-magenta/50 bg-magenta/20 px-3.5 py-1.5 text-[13px] font-bold text-[#f3a6f2]">
              The differentiator
            </span>
            {/*
              E010 — THE CLAIM LEADS WITH ZERO-TO-HERO, not with "connect".

              The section is what the nav calls "Why Panameer", and it opened on
              a piece of plumbing: the punchout. Punchout is the thing no other
              services platform has, but it answers "how do you buy here", not
              "why does this exist" — and for a provider, who is half the
              audience, it answers nothing at all. Zero-to-hero is the claim
              that covers both sides: you can arrive knowing nothing and leave
              earning, and the ERP bridge is how the buying half of that works.
              The punchout keeps its own heading below, where it is a proof
              rather than the pitch.
            */}
            <h2 className="mb-3 text-[30px] font-extrabold tracking-[-0.8px] text-white sm:text-[38px]">
              The only zero-to-hero platform for Enterprise Systems + AI.
            </h2>
            <p className="text-[18px] leading-relaxed text-white/85">
              Start with free training, build a validated profile, meet the
              people already doing the work, and get hired for it — one place,
              start to finish. Nowhere else takes someone from their first
              lesson to their first paid engagement in this field.
            </p>

            <h3 className="mb-2 mt-7 text-[21px] font-bold text-white">
              And the first pure services “Punchout.”
            </h3>
            <p className="text-[17px] leading-relaxed text-white/85">
              Connect your ERP to Panameer with one click and expand what your
              ERP can do — for free. Search, request, order, and settle services
              without ever leaving your system of record.
            </p>
            {/*
              THE MANIFESTO (WS-A) — the why, under the what. This section is
              what the nav calls "Why Panameer", and it argued the mechanism
              (punchout, bidding, settlement) without ever saying why any of it
              should exist. One line does that.
            */}
            <p className="mt-6 border-l-2 border-magenta pl-4 text-[17px] font-semibold italic text-white">
              {BRAND_MANIFESTO}
            </p>

            <ul className="mt-[22px] grid gap-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-white/90">
                  <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-white text-[13px] font-black text-magenta">
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/*
            E011 — the aside was white/[0.06] behind white/15: two values a few
            percent apart on a dark panel, so the card had no edge and its
            subtitle sat below the legibility floor. Raised on both counts.
          */}
          <div className="rounded-2xl border border-white/25 bg-white/[0.12] p-7 text-center">
            <div className="text-[26px] font-extrabold leading-[1.15] text-white">
              Connect your ERP
              <br />
              in under a minute
            </div>
            <div className="mt-2 text-white/80">
              Oracle Cloud, SAP, and more — one click.
            </div>
            <Btn href="/join" className="mt-5">
              See how it works →
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}
