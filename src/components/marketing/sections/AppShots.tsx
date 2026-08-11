import { APP_SHOTS_COPY } from "@/lib/brand";

/**
 * "See the tools you'd be using" — the product-screenshot band (WS-2/WS-3).
 *
 * ⚠ EVERY FRAME IS A LABELLED PLACEHOLDER. There are no real captures yet, and
 * the brief is explicit: use real screenshots or `// TODO real screenshot`
 * placeholders, don't fake UI.
 *
 * WHAT "DON'T FAKE UI" RULES OUT, specifically, because the tempting version is
 * subtle: a grey box with a fake toolbar, three fake table rows and a fake
 * chart would look like a screenshot at thumbnail size and would be a picture
 * of software that does not exist. So each frame is an empty bordered panel
 * that NAMES the screen it will hold and says "screenshot to come". A visitor
 * reads it as a placeholder, which is what it is; nobody can mistake it for
 * product.
 *
 * The band ships rather than waiting because the page's structure is what is
 * being reviewed, and a section that is simply absent cannot be reviewed at
 * all. Replacing each panel is a one-line change per frame.
 */

type Shot = { title: string; caption: string };

const HIRE_SHOTS: Shot[] = [
  { title: "Post a Work Request", caption: "Say what you need in your own words." },
  { title: "Ranked matches", caption: "Experts ordered by depth and recency." },
  { title: "Contract & settlement", caption: "One agreement, one monthly payment." },
];

const WORK_SHOTS: Shot[] = [
  { title: "Your profile", caption: "Built from your résumé, weighted by real time served." },
  { title: "Incoming work", caption: "Requests matched to what you actually do." },
  { title: "Packages & payouts", caption: "Productize once; get paid on delivery." },
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
              {/*
                TODO real screenshot — replace this panel with a captured PNG of
                the named screen. Deliberately empty: see the note at the top of
                this file on why a mocked-up frame would be worse than a blank
                one.
              */}
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

        {/*
          Said once, plainly, under the band. The dashed borders and "screenshot
          to come" already carry it visually; this is for anyone skimming.
        */}
        <p className="mt-6 text-[13px] text-[#6b7191]">
          Product screenshots are being captured — these frames are placeholders,
          not the interface.
        </p>
      </div>
    </section>
  );
}
