import { Btn } from "@/components/marketing/brand";

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
            <h2 className="mb-3 text-[30px] font-extrabold tracking-[-0.8px] text-white sm:text-[38px]">
              The first pure services “Punchout.”
            </h2>
            <p className="text-[18px] text-[#e9dff0]">
              Connect your ERP to Panameer with one click and expand what your
              ERP can do — for free. Search, request, order, and settle services
              without ever leaving your system of record.
            </p>
            <ul className="mt-[22px] grid gap-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[#f3e9f6]">
                  <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-white text-[13px] font-black text-magenta">
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-7 text-center">
            <div className="text-[26px] font-extrabold leading-[1.15]">
              Connect your ERP
              <br />
              in under a minute
            </div>
            <div className="mt-2 text-[#d9c9e2]">
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
