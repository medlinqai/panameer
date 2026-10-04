import { APP_SHOTS_COPY } from "@/lib/brand";

type Shot = { title: string; caption: string };

const HIRE_SHOTS: Shot[] = [
  { title: "Post a Work Request", caption: "Say what you need in your own words." },
  { title: "Ranked matches", caption: "Experts ordered by depth and recency." },
  { title: "Contract & settlement", caption: "One agreement, one monthly payment." },
];

const WORK_SHOTS: Shot[] = [
  { title: "Your profile", caption: "Built from your résumé, weighted by real time served." },
  { title: "Incoming work", caption: "Requests matched to what you actually do." },
  { title: "Service products & payouts", caption: "Productize once; get paid on delivery." },
];

export function AppShots({ page }: { page: "hire" | "work" }) {
  const copy = APP_SHOTS_COPY[page];
  const shots = page === "hire" ? HIRE_SHOTS : WORK_SHOTS;

  return (
    <section className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1120px] px-7">
        <p className="mb-3 font-display text-[12px] font-semibold uppercase tracking-[0.16em] text-magenta">
          {copy.eyebrow}
        </p>
        <h2 className="max-w-[620px] text-balance text-[30px] font-semibold leading-[1.1] sm:text-[36px]">
          {copy.headline}
        </h2>
        <p className="mt-4 max-w-[620px] text-[16.5px] leading-relaxed text-[#3a4266]">
          {copy.lead}
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {shots.map((s) => (
            <figure key={s.title}>
              {}
              <div className="grid aspect-[4/3] place-items-center rounded-[14px] border border-dashed border-line bg-canvas px-5 text-center">
                <span className="text-[13px] text-[#6b7191]">
                  Screenshot to come
                </span>
              </div>
              <figcaption className="mt-3">
                <span className="block text-[15.5px] font-bold">{s.title}</span>
                <span className="mt-0.5 block text-[14px] text-[#3a4266]">
                  {s.caption}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {}
        <p className="mt-6 text-[13px] text-[#6b7191]">
          Product screenshots are being captured — these frames are placeholders,
          not the interface.
        </p>
      </div>
    </section>
  );
}
