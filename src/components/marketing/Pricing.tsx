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

        <div className="mt-[34px] flex flex-wrap gap-3">
          {MODELS.map((m) => (
            <span
              key={m}
              className="rounded-full border border-line bg-white px-[18px] py-2.5 font-bold text-ink"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
