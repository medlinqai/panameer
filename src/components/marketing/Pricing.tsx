import { Btn } from "@/components/marketing/brand";
import { Eyebrow, H2, Lead } from "@/components/marketing/section";

const BASIC = [
  "Unlimited work requests",
  "Browse & invite providers",
  "Settle by hour or milestone",
  "Free learning paths",
];
const PLUS = [
  "Everything in Basic",
  "Validated experts",
  "One-click ERP punchout",
  "Priority matching & support",
];
const MODELS = [
  "Hourly Contractor",
  "Monthly Contractor",
  "Offshore Outsourcing",
  "Employer of Record",
  "Staff Augmentation",
];

function Check({ children }: { children: string }) {
  return (
    <li className="flex items-center gap-2.5 text-ink">
      <span className="font-black text-magenta">✓</span>
      {children}
    </li>
  );
}

export function Pricing() {
  return (
    /*
      E016.11 — CHECKED, AND LEFT WHITE. Counting page backgrounds after the D3
      move suggests three whites in a row (HowItWorks, Punchout, Pricing) and a
      flip somewhere. Counting what is actually SEEN says otherwise: Punchout's
      background is white but it renders a full dark gradient panel edge to
      edge, so the sequence reads

        magenta ribbon · dark hero · soft Learn · white How · dark Punchout ·
        white Pricing · ink footer

      — which alternates on every boundary. Flipping this section to soft would
      also collide with the Basic card, which is bg-soft precisely so it
      separates from a white section (E011); the card would vanish into the band
      and the fix for one walk error would reopen another.
    */
    <section id="pricing" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Pricing</Eyebrow>
        <H2>Flexible pricing that scales with your business</H2>
        <Lead>Post for free. Choose the engagement model that fits the work.</Lead>

        <div className="grid max-w-[820px] gap-[22px] md:grid-cols-2">
          {/*
            E011 — the plan cards read as one grey field: a hairline border on
            white beside a magenta-bordered card with a shadow, and body copy in
            ink-2 on both. Basic keeps the quiet treatment but gets a background
            that separates it from the page, and both headings take an explicit
            ink so neither depends on an inherited token.
          */}
          <div className="rounded-[18px] border border-line bg-bg-soft p-[30px]">
            <h3 className="mb-1 text-[22px] font-bold text-ink">Basic</h3>
            <p className="mb-[18px] text-ink-2">
              Everything you need to post work and hire your first experts.
            </p>
            <ul className="mb-[22px] grid gap-2.5">
              {BASIC.map((f) => (
                <Check key={f}>{f}</Check>
              ))}
            </ul>
            <Btn href="/join" variant="ghost">
              Get started for free
            </Btn>
          </div>

          <div className="rounded-[18px] border-2 border-magenta bg-white p-[30px] shadow-brand">
            <h3 className="mb-1 text-[22px] font-bold text-ink">Business Plus</h3>
            {/*
              E004 — "the top 1% of talent" is gone from here too. It is the
              colosseum framing this brand is explicitly not: the voice is
              "Together", and a ranked pile with ninety-nine percent of people
              underneath it is the opposite of a community. What replaces it
              claims only what the bullets below already list — no new tier
              promise was invented, because the tier concept itself is E013.
            */}
            <p className="mb-[18px] text-ink-2">
              ERP integration, priority matching, and support.
            </p>
            <ul className="mb-[22px] grid gap-2.5">
              {PLUS.map((f) => (
                <Check key={f}>{f}</Check>
              ))}
            </ul>
            <Btn href="/join">Get started for free</Btn>
          </div>
        </div>

        {/*
          E016.10 — THESE ARE LABELS, AND NOW LOOK LIKE IT.

          They were already `<span>`s, so nothing was ever clickable — the
          problem was purely that they were dressed as controls: pill radius,
          white fill on a white section, a border, bold text. Beside two cards
          whose buttons look almost exactly the same, that reads as a filter row
          that ignores you.

          Made honest rather than made live. A real filter would need pricing
          content per model to filter TO, and there is one Basic card and one
          Plus card — filtering two cards by five engagement models is a control
          with nothing behind it either. So: a stated list, introduced by the
          label that says what it is, in the flat chip treatment used for
          read-only vocabulary elsewhere. Not bold, no pill, no hover.

          When engagement models get their own content, this becomes anchors —
          the array is already the list.
        */}
        <div className="mt-[34px]">
          <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink-2">
            Engagement models supported
          </p>
          <ul className="flex flex-wrap gap-2.5">
            {MODELS.map((m) => (
              <li
                key={m}
                className="rounded-[8px] border border-line bg-white/70 px-3.5 py-2 text-[14.5px] text-ink-2"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
