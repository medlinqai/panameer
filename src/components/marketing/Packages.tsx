import { Eyebrow, H2, Lead } from "@/components/marketing/section";

/**
 * "By Packages" — the third way to buy (E028(iii)).
 *
 * ⚠ THIS IS A PLACEHOLDER, AND IT SAYS SO ON EVERY TILE. No packages exist:
 * the Package model is built and providers can create them, but none have been
 * published. The brief
 * asks for the slot to be reserved without fabricating the contents, so what
 * ships is the SHAPE — the groups a package will belong to — with an honest
 * "Coming Soon" on each.
 *
 * WHY RESERVE A SLOT AT ALL rather than wait. Packages are the third buying
 * model beside a Work Request and hiring an expert, and the two live ones are
 * both on this page already. A visitor who sees only those two learns that
 * Panameer is hourly consulting; the difference between "we have not built it"
 * and "we do not do it" is worth a section.
 *
 * WHAT MAKES IT HONEST rather than a fake: no package names, no counts, no
 * prices, no logos, and nothing is clickable. A tile states a group and says it
 * is not open yet. Nobody can misread that as inventory.
 *
 * WHEN PACKAGES SHIP, this file's `GROUPS` becomes a query and the tiles become
 * links. The heading and the framing survive unchanged.
 */

/**
 * The groups packages will be organised into.
 *
 * THESE ARE THE CATALOG'S OWN DOMAINS, not a second taxonomy invented for this
 * section. They are the eight Application-Specific domains seeded in
 * service-catalog.json — the same containers a provider's skills, a Work
 * Request and the whole Role → Domain → Skill tree already use. A package is
 * work in a domain, so "which domains will have packages" is answerable today
 * even though "which packages" is not.
 *
 * The first draft of this list was six engagement shapes (Implementation,
 * Managed Support, Data & Migration…) with a comment claiming they came from
 * the catalog. They did not — that was a second vocabulary invented for one
 * marketing section, which is how a product ends up with two names for the same
 * thing. The seeded EngagementType rows are Contract / Fulltime / Temporary and
 * are about how someone is engaged, not what is being sold.
 *
 * HARDCODED for the same reason LearnFree's chips are: this page is statically
 * rendered, and a Prisma read here would make the marketing home dynamic on
 * every request to fetch a list that changes a few times a year.
 *
 * NO BLURBS. A one-liner under each would be invented copy describing packages
 * that do not exist — the name and an honest "Coming Soon" is the whole truth
 * available.
 */
const GROUPS = [
  "Financials",
  "Procurement",
  "Project Management",
  "Supply Chain Management",
  "Human Capital Management",
  "Customer Experience",
  "Enterprise Performance Management",
  "Risk & Compliance",
];

export function Packages() {
  return (
    /*
      WHITE, not soft. LearnFree directly above is the soft band, and two soft
      sections touching is not a band — it is one long section with a heading in
      the middle of it. See the sequence in page.tsx.
    */
    <section id="packages" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Packages</Eyebrow>
        <H2>By Packages — All-Inclusive: Manage Risk &amp; Contain Costs</H2>
        <Lead>
          A package is a fixed scope at a fixed price, delivered by a provider
          who has done it before. You know the cost before you start.
        </Lead>

        {/*
          THE BANNER IS NOT DECORATION. Six tiles that each say "Coming Soon"
          could still read as six things you might be able to buy if you squint.
          One plain sentence above them removes the ambiguity before anyone
          starts scanning.
        */}
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-magenta/30 bg-magenta/6 px-4 py-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-magenta" aria-hidden />
          <p className="text-[13.5px] font-semibold text-ink">
            Packages open later this phase — these are the groups they&apos;ll
            arrive in.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {GROUPS.map((name) => (
            /*
              A <div>, not a <button> or a <Link>. There is nowhere to go, and a
              control that does nothing is the dead click this whole home-page
              walk has been about. The dashed border is the second signal, so
              the tile reads as reserved space even with the badge ignored.
            */
            <div
              key={name}
              className="rounded-brand border border-dashed border-line bg-white px-[18px] py-4"
            >
              <h3 className="text-[15px] font-bold leading-snug text-ink">{name}</h3>
              <span className="mt-2 inline-block rounded-full bg-bg-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-2">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
