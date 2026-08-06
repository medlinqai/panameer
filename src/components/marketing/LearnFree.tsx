import { Eyebrow, H2, Lead } from "@/components/marketing/section";

const PATHS = [
  "Oracle Cloud Foundations",
  "Basic Procurement",
  "Advanced Procurement",
  "Enterprise Contracts",
  "Payables",
  "Inventory Management",
  "Oracle Business Network",
  "Core Human Resources",
  "Project Portfolio Mgmt.",
];

export function LearnFree() {
  return (
    <section id="learn" className="bg-bg-soft py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Learn</Eyebrow>
        <H2>Learn to use applications — free</H2>
        <Lead>
          Guided learning paths and courses across the enterprise stack, open to
          everyone.
        </Lead>
        <div className="flex flex-wrap gap-3">
          {PATHS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-line bg-white px-[18px] py-2.5 font-bold text-ink"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
