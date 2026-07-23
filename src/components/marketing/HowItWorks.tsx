import { Eyebrow, H2, Lead } from "@/components/marketing/section";

const APPS: { icon: string; label: string }[] = [
  { icon: "▦", label: "Inventory Mgmt." },
  { icon: "◇", label: "Procurement" },
  { icon: "$", label: "Financials Mgmt." },
  { icon: "◈", label: "Project Portfolio Mgmt." },
  { icon: "☺", label: "Core Human Resources" },
  { icon: "⚙", label: "Manufacturing" },
  { icon: "⇄", label: "Supply Chain Planning" },
  { icon: "▣", label: "Financial Close" },
];

const STEPS: { n: number; title: string; body: string }[] = [
  {
    n: 1,
    title: "Posting is always free",
    body: "Describe the work — directly or straight from your ERP. No cost to post.",
  },
  {
    n: 2,
    title: "Get proposals & hire",
    body: "See every vetted provider for your request with one click and pick your winner.",
  },
  {
    n: 3,
    title: "Pay when the work is done",
    body: "By the hour, by milestone, or by draw-down — settled through Panameer.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>How it works</Eyebrow>
        <H2>Find service providers for every application</H2>
        <Lead>
          Experts across the full enterprise stack — matched to exactly what you
          need done.
        </Lead>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {APPS.map((app) => (
            <div
              key={app.label}
              className="flex items-center gap-3 rounded-brand border border-line bg-white px-[18px] py-5 font-bold transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand"
            >
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[linear-gradient(135deg,#f3cdf1,#eeb4ec)] text-[17px] text-magenta">
                {app.icon}
              </span>
              {app.label}
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="rounded-brand border border-line bg-bg-soft p-[26px]"
            >
              <div className="mb-3.5 grid h-[34px] w-[34px] place-items-center rounded-full bg-magenta font-extrabold text-white">
                {step.n}
              </div>
              <h3 className="mb-1.5 text-[19px] font-bold">{step.title}</h3>
              <p className="text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
