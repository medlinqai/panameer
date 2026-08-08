import { Eyebrow, H2, Lead } from "@/components/marketing/section";
import { Btn } from "@/components/marketing/brand";

/**
 * "Become a Creator" — Credits and teaching, on the provider page (WS-E).
 *
 * WHY IT IS HERE AND NOT ON `/`. Teaching is the second thing a provider can
 * sell, and it only reads as an opportunity to somebody who already knows they
 * have expertise worth selling. On the combined landing it would be a fourth
 * thing to explain to a stranger; three sections after the provider hero, it is
 * the obvious next question.
 *
 * ⚠ THE CREDITS HALF IS PRE-LAUNCH VISION, and this is the third surface making
 * that call, so it is worth writing down where the three sit:
 *
 *   ribbon        present tense, because the "in active development" banner
 *                 renders directly above it
 *   AccountPitch  future tense, because it stands alone at the moment someone
 *                 hands over an email
 *   here          future tense, same reason — this is a recruit, and a recruit
 *                 that overstates the pay is the one people remember
 *
 * `getCreditsSummary` still returns a hard zero with `pending: true`; nothing
 * awards a Credit yet. The teaching side is real — Learn has an admin CMS, real
 * instructors and per-lesson attribution — so the CTA points at something that
 * exists rather than at a form that does not.
 */
export function CreatorBand() {
  return (
    /*
      WHITE, because Learn directly above it is soft. Two soft sections touching
      is not a band, it is one long section with a heading in the middle — the
      same call Packages made under LearnFree on the old combined page.
    */
    <section id="creator" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Community Credits</Eyebrow>
        <H2>Know This Cold? Teach It. Earn From It.</H2>
        <Lead>
          The people teaching on Panameer are the people implementing this for a
          living. If that is you, your knowledge is a second thing you can sell
          here — and the community pays you back for it.
        </Lead>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Teach What You Know",
              body: "Author a course on the module you have deployed twenty times. Panameer's team produces it with you.",
            },
            {
              title: "Get Credited by Name",
              body: "Every lesson carries its instructor. Learners see who taught them, and so do the buyers reading your profile.",
            },
            {
              title: "Earn Community Credits",
              body: "Contributing will earn Credits you can spend on group sessions and mentoring — the ledger opens later this phase.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-brand border border-line bg-white p-6"
            >
              <h3 className="text-[17px] font-bold text-ink">{c.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                {c.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {/*
            /join, not a "become a creator" form — there isn't one, and a CTA
            that opens a page which does not exist is the dead click this whole
            walk has been about. Authoring runs through the admin CMS today, so
            the honest first step is having an account.
          */}
          <Btn href="/join?type=seller">Join and Start Teaching</Btn>
          <Btn href="/learn" variant="ghost">
            See What&apos;s Already Taught
          </Btn>
        </div>
      </div>
    </section>
  );
}
