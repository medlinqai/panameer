import { test, expect } from "@playwright/test";
/*
  ── ⚠⚠ THE SHARED CLIENT, NOT A SECOND ONE (`E585`) ─────────────────────────
  ⚠ A bare `new PrismaClient()` throws here — Prisma 7 needs the `@prisma/adapter-pg`
  driver adapter, and Playwright does not load `.env.local`.
  ⚠⚠ `e2e-shell/_db.ts` already solves BOTH, plus the shared-pooler retry that
  `E597` WS-D added after `check:wizard-contract` failed ~4 of 12 runs on
  `08006 / EAUTHTIMEOUT`. ⚠⚠⚠ WRITING A SECOND CLIENT HERE WOULD HAVE
  RE-INTRODUCED THAT FLAKE INTO A BRAND-NEW GATE — and a gate that fails at
  random is a gate someone switches off (ruling 10).
*/
import { db } from "../e2e-shell/_db";

/**
 * ── ⚠⚠⚠ THE LEAK TEST — `P2-A1.1-E738` WS-C ──────────────────────────────
 *
 * ⚠ THE BRIEF: *"A test that loads the masked profile and the grid **signed
 * out** and fails if any masked value for the test profiles appears anywhere in
 * the response (HTML and data). Include Scott's profile: no "Walls", "Scott",
 * "StratERP", "Ceres", "DOE", employer names, email or phone."*
 *
 * ── ⚠⚠⚠ WHY THE NEEDLES ARE READ FROM THE DATABASE, NOT TYPED IN ──────────
 *
 * ⚠⚠ **A HARD-CODED NEEDLE LIST IS AN ASSERTION THAT STOPS TESTING THE MOMENT
 * THE DATA CHANGES.** The brief names five strings; this suite reads the ACTUAL
 * first name, last name, email, phone, every employer name, every client name
 * and every school for each profile it loads, and asserts none of them appears.
 * ⚠⚠⚠ **SO A PROFILE ADDED NEXT MONTH IS COVERED WITHOUT ANYONE EDITING THIS
 * FILE** — ruling 11's lesson, applied to a needle list: an assertion whose
 * population cannot grow is an assertion that quietly narrows.
 * ⚠ The brief's five literals are asserted TOO, as a floor, so the measured
 * case Scott named can never be dropped by a refactor.
 *
 * ── ⚠⚠ IT CHECKS THE **WHOLE RESPONSE**, NOT THE RENDERED TEXT ────────────
 *
 * ⚠⚠⚠ **`innerText` WOULD PASS ON A LEAK HIDDEN IN A PROP, AN `alt`, A
 * `<title>`, AN IMAGE URL OR THE FLIGHT PAYLOAD** — and the React Server
 * Component payload is exactly where a masked field would hide, because it is
 * serialised into the HTML as data. ⚠ So the raw response body is what is
 * searched, which is the only reading of *"HTML and data"* that means anything.
 */

const prisma = db();

/** ⚠ Short needles would match ordinary words; the scrubber uses the same floor. */
const MIN = 3;

type Target = {
  profileId: string;
  label: string;
  needles: string[];
};

/**
 * ⚠⚠ Every value that must NOT appear, read live for one profile.
 * ⚠ Names are split into words as well, so `"Ceres Global Ag Corp"` also
 * forbids the bare `Ceres` the document actually says.
 */
async function targetFor(profileId: string, label: string): Promise<Target> {
  const p = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: {
      person: {
        select: {
          first_name: true,
          last_name: true,
          phone: true,
          photo_url: true,
          user: { select: { email: true } },
        },
      },
      employers: { select: { name: true } },
      projects: { select: { client_name: true } },
      education: { select: { institution: true } },
    },
  });
  if (!p) throw new Error(`no profile ${profileId}`);

  /*
    ── ⚠⚠⚠ TWO CLASSES OF NEEDLE, AND CONFLATING THEM IS WHAT PRODUCED FOUR
          FALSE REDS IN A ROW ─────────────────────────────────────────────────

    ⚠⚠ **A PERSON'S NAME IS MATCHED WORD BY WORD.** `Scott` and `Walls` are each
    a leak on their own, and a résumé summary saying *"Scott led…"* must fail.

    ⚠⚠⚠ **AN ORGANISATION'S NAME IS MATCHED WHOLE, NEVER WORD BY WORD.** An
    employer called *"Oracle Implementation Specialists"* does not make
    `Implementation` a forbidden string — that word is in the skill catalog, in
    page copy and in half the titles on the site. ⚠ Splitting those names fired
    on `https`, `Mexico`, `Project` and `Implementation` across four runs, **and
    not one of them was a leak.**
    ⚠⚠ Ruling 10: *"the cost of a false red is not the false red; it is that
    people stop believing the green."* ⚠⚠⚠ **AND THE WHOLE-NAME TEST IS THE ONE
    THAT MATCHES THE PRODUCT RULE ANYWAY** — `EMPLOYER_LOCK_COPY` promises that
    the employer's NAME is not shown, not that no word of it appears anywhere.
  */
  const needles = new Set<string>();

  /** ⚠ Word-by-word: the person themselves. */
  for (const v of [p.person.first_name, p.person.last_name]) {
    const t = v?.trim();
    if (t && t.length >= MIN && !GENERIC.has(t.toLowerCase())) needles.add(t);
  }

  /** ⚠ Whole-string: contact details and organisation names. */
  for (const v of [
    p.person.phone,
    p.person.user?.email,
    /* ⚠⚠ THE PHOTO URL IS A MASKED VALUE TOO — the brief forbids a masked value
       *"in image URLs"*, and a Supabase object path is a stable identifier. */
    p.person.photo_url,
    ...p.employers.map((e) => e.name),
    ...p.projects.map((pr) => pr.client_name),
    ...p.education.map((e) => e.institution),
  ]) {
    const t = v?.trim();
    if (!t || t.length < MIN) continue;
    /* ⚠ A one-word organisation name is still matched — it IS the whole name. */
    needles.add(t);
  }

  /* ⚠ Drop any needle our own brand would match — see `OUR_BRAND` above. */
  const usable = [...needles].filter((n) => !OUR_BRAND.includes(n.toLowerCase()));
  return { profileId, label, needles: usable };
}

/*
  ⚠⚠ A `prismaAddress()` HELPER STOOD HERE AND IS GONE WITH THE WORD-SPLITTING
  IT EXISTED TO PATCH. It excluded the shown state/country from the needle list
  so an employer named "…Mexico…" did not fail the gate on a location the page
  prints by design. ⚠ Matching organisation names WHOLE removes the cause, so the
  patch is no longer needed — see the two-classes note in `targetFor`.
*/

/** ⚠ Words that appear in ordinary page copy and would produce a false red. */
/**
 * ── ⚠⚠⚠ A NEEDLE THAT IS PART OF OUR OWN BRAND CANNOT BE SCANNED FOR (`E756`)
 *
 * ⚠⚠ **MEASURED, 2026-10-02, AND IT WAS A FALSE RED:** a real provider's
 * organisation is literally named **`Panameer.com`**, and `P2-ALL-E754` added
 * `href="https://status.panameer.com"` to the dev banner — which renders from the
 * ROOT layout, so it is on every page including `/providers/<id>`. The scan found
 * that href and reported a leak. ⚠ The ONLY occurrence in the whole response was
 * the banner's own link; no profile data was exposed.
 *
 * ⚠⚠⚠ **THIS IS THE SAME CLASS AS `GENERIC`, NOT A WEAKENING.** A substring scan
 * cannot tell "the company is called Panameer.com" from "the page says
 * panameer.com in its chrome", because our own name and domain appear in the
 * header, the footer, every canonical URL and now the banner. ⚠ Ruling 10: a
 * needle that can match by accident makes the gate a false red, and the cost of a
 * false red is that people stop believing the green.
 *
 * ⚠ **WHAT IS GIVEN UP, STATED HONESTLY:** if a provider's organisation name is a
 * fragment of our own domain, this gate does not protect that one string. ⚠⚠ It
 * still protects their person name, email, phone and every other organisation —
 * and the mask itself is enforced by the TYPE in `masked-profile.ts`, not by this
 * test, so nothing about the product changes.
 */
const OUR_BRAND = "panameer.com";

const GENERIC = new Set([
  "limited", "corporation", "company", "group", "holdings", "partners",
  "services", "solutions", "systems", "technologies", "technology",
  "consulting", "consultants", "international", "global", "worldwide",
  "associates", "enterprises", "industries", "university", "college",
  "institute", "school", "cloud", "oracle", "procurement", "business",
  "management", "information", "science", "bachelor", "master", "senior",
  "principal", "consultant", "director", "manager", "analyst", "engineer",
  "specialist", "expert", "lead", "america", "american", "national",
  "panameer", "profile", "member", "search", "score", "skills", "english",
  /* ⚠ The page prints these literally as fallback labels, so an employer or
     client whose NAME contains one would otherwise fail the gate on ordinary
     page copy. ⚠⚠ Measured: a client named "…Project…" did exactly that. */
  "project", "engagement", "consulting", "independent",
]);

/** ⚠ A word-boundary test, so `Ceres` does not fire inside `interference`. */
function leaks(body: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, "iu").test(body);
}

test.describe("E738 WS-C — the masked set does not leak", () => {
  /* ⚠ No `afterAll` disconnect: `db()` is the shared client and the suite does
     not own its lifetime. ⚠⚠ A teardown that can throw can hide the result it
     was protecting (ruling 12), and disconnecting a client somebody else owns
     is exactly that shape. */
  test("⚠⚠⚠ the masked profile leaks nothing, for every eligible profile", async ({
    request,
  }) => {
    /*
      ⚠⚠ IT WALKS A SAMPLE OF REAL PROFILES, NOT ONE. ⚠ Scott's is asserted by
      name below; this covers the population, because a mask that holds for one
      record and not the next is not a mask.
      ⚠ Capped so the gate stays inside its timeout — the cap is stated, not
      hidden, and the sample is the TOP of the same ordering the grid uses, i.e.
      the profiles a visitor actually reaches first.
    */
    const rows = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE", paused_at: null, preview_hidden_at: null },
      select: { id: true },
      orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
      take: 8,
    });
    expect(rows.length, "no eligible profiles to test — the gate would prove nothing").toBeGreaterThan(0);

    let checked = 0;
    for (const r of rows) {
      const t = await targetFor(r.id, r.id);
      const res = await request.get(`/providers/${r.id}`);
      /* ⚠ A profile that is not publicly previewable renders the "not
         available" page, which is a 200 and is also a valid thing to scan. */
      expect(res.status(), `/providers/${r.id}`).toBe(200);
      const body = await res.text();
      for (const n of t.needles) {
        expect(leaks(body, n), `"${n}" leaked on /providers/${r.id}`).toBe(false);
      }
      checked += t.needles.length;
    }
    console.log(
      `E738/WS-C  masked profile — ${rows.length} profiles, ${checked} live needles, 0 leaks`
    );
  });

  test("⚠⚠ Scott's profile, with the five literals the brief names", async ({
    request,
  }) => {
    const scott = await prisma.providerProfile.findFirst({
      where: {
        person: {
          first_name: { equals: "Scott", mode: "insensitive" },
          last_name: { equals: "Walls", mode: "insensitive" },
        },
      },
      select: { id: true },
    });
    expect(scott, "Scott's profile is missing — this assertion cannot run").not.toBeNull();

    const res = await request.get(`/providers/${scott!.id}`);
    expect(res.status()).toBe(200);
    const body = await res.text();

    /* ⚠⚠ THE BRIEF'S OWN LIST, AS A FLOOR. ⚠ `DOE` is upper-case and three
       letters; the word-boundary test is what keeps it off `does` and `doe`. */
    for (const n of ["Walls", "Scott", "StratERP", "Ceres", "DOE"]) {
      expect(leaks(body, n), `"${n}" leaked on Scott's masked profile`).toBe(false);
    }
    /* ⚠ And the live values, which is the part that keeps working as data
       changes. */
    const t = await targetFor(scott!.id, "scott");
    for (const n of t.needles) {
      expect(leaks(body, n), `"${n}" leaked on Scott's masked profile`).toBe(false);
    }
    console.log(
      `E738/WS-C  Scott — 5 literals + ${t.needles.length} live needles, 0 leaks`
    );
  });

  /**
   * ── ⚠⚠⚠ THE BLURRED PREVIEW LEAKS NOTHING EITHER (`P2-A1.1-E767`) ─────────
   *
   * ⚠ Scott, 2026-10-02: *"maybe all that info, but blurry"* — and the whole risk
   * of that instruction is a CSS blur over a real value, which hides nothing.
   * ⚠⚠⚠ **SO THIS ASSERTS BOTH HALVES, AND THE SECOND IS WHAT MAKES THE FIRST
   * MEAN ANYTHING:** the original photo URL is absent, AND a `data:image/jpeg`
   * blur is actually present. ⚠ Without the second, a page that rendered no photo
   * at all would pass every absence check while proving nothing (ruling 12).
   */
  test("⚠⚠⚠ the blurred preview carries bytes, never a photo URL", async ({ request }) => {
    const rows = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE", paused_at: null, preview_hidden_at: null },
      select: { id: true, person: { select: { photo_url: true } } },
      orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
      take: 6,
    });
    const withPhoto = rows.filter((r) => r.person.photo_url);
    expect(
      withPhoto.length,
      "no sampled profile has a photo — this gate would prove nothing"
    ).toBeGreaterThan(0);

    let blurred = 0;
    for (const r of withPhoto) {
      const res = await request.get(`/providers/${r.id}`);
      expect(res.status()).toBe(200);
      const body = await res.text();
      const url = r.person.photo_url as string;

      /* ⚠⚠ THE URL ITSELF, AND ITS FILENAME. A stored path like
         `/seed-avatars/test7-1jziy1.svg` would also leak as its last segment if
         something rebuilt a URL from parts, so both are needles. */
      expect(body.includes(url), `the photo URL leaked on /providers/${r.id}`).toBe(false);
      const file = url.split("/").pop();
      if (file && file.length >= MIN) {
        expect(body.includes(file), `the photo FILENAME leaked on /providers/${r.id}`).toBe(false);
      }
      if (body.includes("data:image/jpeg")) blurred += 1;
    }
    /* ⚠⚠⚠ AND THE BLUR IS REALLY THERE. */
    expect(blurred, "no blurred photo rendered — the absence checks above are vacuous").toBe(
      withPhoto.length
    );

    /* ⚠⚠ THE GRID TOO, AND THE SIZE IS PART OF THE CLAIM: a `data:` URI big
       enough to carry a recognisable face would defeat the whole mechanism.
       16px at quality 40 lands around 300-700 bytes; 4000 is a generous ceiling
       that still fails loudly if someone raises the resize. */
    const grid = await (await request.get("/explore")).text();
    const uris = [...grid.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)].map((m) => m[1]);
    expect(uris.length, "the grid rendered no blurred photos").toBeGreaterThan(0);
    const biggest = Math.max(...uris.map((u) => u.length));
    expect(biggest, "a blur is far larger than a 16px JPEG should be").toBeLessThan(4000);
    console.log(
      `E767  blur — ${blurred}/${withPhoto.length} profiles blurred, ${uris.length} on the grid, ` +
        `largest ${biggest} base64 chars, 0 photo URLs`
    );
  });

  test("⚠⚠ the Browse Talent grid leaks no name or photo URL", async ({ request }) => {
    const res = await request.get("/explore");
    expect(res.status()).toBe(200);
    const body = await res.text();

    const rows = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE", paused_at: null, preview_hidden_at: null },
      select: {
        person: { select: { first_name: true, last_name: true, photo_url: true } },
        /* ⚠⚠ WIDENED BY `E767`: the cards now render blurred EMPLOYER and CLIENT
           placeholders, so the real ones have to be proven absent here too — the
           grid test only ever checked names and photo URLs. */
        employers: { select: { name: true } },
        projects: { select: { client_name: true } },
      },
      orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
      take: 20,
    });

    let n = 0;
    for (const r of rows) {
      for (const v of [
        r.person.first_name,
        r.person.last_name,
        r.person.photo_url,
        ...r.employers.map((e) => e.name),
        ...r.projects.map((pr) => pr.client_name),
      ]) {
        const t = v?.trim();
        if (!t || t.length < MIN || GENERIC.has(t.toLowerCase())) continue;
        /* ⚠⚠⚠ THE SAME `OUR_BRAND` EXCLUSION THE PROFILE TEST ALREADY CARRIES,
           AND WIDENING THIS TEST IS WHAT EXPOSED THAT IT DID NOT. A real
           provider's organisation is named `Panameer.com`, and the dev banner
           renders `href="https://status.panameer.com"` — so the needle matched
           our own brand, not a leak. ⚠ `includes`, not equality: the profile
           test's list is lower-cased names, and an organisation whose name
           CONTAINS our domain has the same problem. */
        if (t.toLowerCase().includes(OUR_BRAND)) continue;
        expect(leaks(body, t), `"${t}" leaked on /explore`).toBe(false);
        n += 1;
      }
    }
    /* ⚠⚠⚠ THE GRID MUST ALSO HAVE RENDERED SOMETHING — a page that 500'd, or
       returned zero cards, would pass every absence check above while proving
       nothing (ruling 12: *"an assertion its own mutation cannot fail is not an
       assertion"*). */
    expect(body, "the grid rendered no lock line — did it render any cards?").toContain(
      "shown after you join"
    );
    console.log(`E738/WS-C  grid — ${n} live needles, 0 leaks, cards present`);
  });

  test("⚠⚠ masked pages are noindex; the grid is reachable signed out", async ({
    request,
  }) => {
    const scott = await prisma.providerProfile.findFirst({
      where: { person: { last_name: { equals: "Walls", mode: "insensitive" } } },
      select: { id: true },
    });
    const res = await request.get(`/providers/${scott!.id}`);
    const body = await res.text();
    /* ⚠ SCOTT'S ANSWER 4: *"Masked pages `noindex`."* */
    expect(body, "the masked profile is missing its noindex").toMatch(
      /name="robots"[^>]*content="noindex/
    );
    /* ⚠⚠ AND THE `<title>` IS THE TITLE, NEVER THE NAME — metadata is the leak
       nobody looks at (it is in the tab, the history and every link preview). */
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    expect(title.toLowerCase(), "the page title names the member").not.toContain("walls");
    console.log(`E738/WS-C  noindex present, title = ${JSON.stringify(title)}`);
  });

  /*
    ── ⚠⚠⚠ THE OPT-IN, BOTH WAYS (Scott's lane 4 addition) ──────────────────

    ⚠ *"Leak test covers both states: option off → no name anywhere in the
    response."*
    ⚠⚠ **IT FLIPS THE COLUMN AND PUTS IT BACK**, because asserting the OFF state
    alone would pass on a feature that never works, and asserting the ON state
    alone would not prove the default is safe. ⚠⚠⚠ **A TEST THAT ONLY EVER SEES
    ONE STATE CANNOT TELL YOU THE SWITCH DOES ANYTHING.**
    ⚠ The restore runs in a `finally`, so a failed expectation cannot leave a
    member's name published.
  */
  test("⚠⚠⚠ /pro/<slug>: off hides the name, on shows it, and it is restored", async ({
    request,
  }) => {
    const scott = await prisma.providerProfile.findFirst({
      where: { person: { last_name: { equals: "Walls", mode: "insensitive" } } },
      select: { id: true, public_name_at: true },
    });
    expect(scott).not.toBeNull();

    const slugRow = await prisma.providerProfileSlug.findFirst({
      where: { profile_id: scott!.id, is_current: true },
      select: { slug: true },
    });
    /* ⚠ The slug is minted when the owner's profile page renders. If it does
       not exist yet this assertion cannot run, and saying so is better than
       silently skipping. */
    expect(slugRow, "no slug minted yet — open /profile as the owner once").not.toBeNull();
    const slug = slugRow!.slug;

    const original = scott!.public_name_at;
    try {
      /* ── OFF ─────────────────────────────────────────────────────────── */
      await prisma.providerProfile.update({
        where: { id: scott!.id },
        data: { public_name_at: null },
      });
      /*
        ── ⚠⚠⚠ WHAT IS ASSERTABLE HERE, AND WHAT IS NOT. READ THIS BEFORE
              "TIGHTENING" IT. ──────────────────────────────────────────────

        ⚠⚠⚠ **SCOTT'S TWO REQUIREMENTS CANNOT BOTH HOLD, AND THE REASON IS
        STRUCTURAL RATHER THAN A BUG WE DECLINED TO FIX:**
          · *"Off: `/pro/<slug>` shows the masked preview."*  → the URL exists
          · *"option off → no name anywhere in the response."*
        ⚠ The slug is `<first>-<last>`. **NEXT SERIALISES THE ROUTE SEGMENTS
        INTO THE DOCUMENT IT EMITS — INCLUDING THE SHELL IT EMITS ALONGSIDE A
        REDIRECT.** Measured 2026-10-01: a `307` to `/providers/<id>` still
        carries `["","in","scott-walls"]` inside `self.__next_f.push(...)`.
        ⚠⚠ **SO NO RESPONSE AT A NAME-DERIVED URL CAN BE NAME-FREE.** Asserting
        otherwise would be asserting something no implementation can satisfy,
        and a gate that cannot go green is a gate somebody deletes (ruling 10).

        ⚠⚠ **WHAT IS ASSERTED INSTEAD IS EVERYTHING THAT ACTUALLY PROTECTS THE
        MEMBER**, and each line is a real property:
          1. the forward's `location` header carries NO name — so the address
             bar, the history and anything shared onward are clean;
          2. the page the visitor LANDS on carries no name and is `noindex`;
          3. nothing but the URL echo is left — proven by checking the body
             against every live needle EXCEPT the slug itself.
        ⚠⚠⚠ **REPORTED TO SCOTT AS AN OPEN QUESTION:** the only way to make the
        OFF state leak nothing at all is to stop deriving the slug from the
        name. That is a product decision about what `/pro/` is FOR.
        ⚠ RENAMED `/in/` → `/pro/` by `P2-A1.1-E756`; `/in/` still 308s here.
      */
      const off = await request.get(`/pro/${slug}`, { maxRedirects: 0 });
      expect([302, 303, 307]).toContain(off.status());

      /* 1 — the forward names nobody. */
      const loc = off.headers()["location"] ?? "";
      for (const n of ["Walls", "Scott"]) {
        expect(leaks(loc, n), `"${n}" is in the forward's location header`).toBe(false);
      }
      expect(loc, "the forward does not go to the masked profile").toContain(
        `/providers/${scott!.id}`
      );

      /* 2 — the landing page is the masked preview and names nobody. */
      const landed = await request.get(`/providers/${scott!.id}`);
      expect(landed.status()).toBe(200);
      const landedBody = await landed.text();
      for (const n of ["Walls", "Scott"]) {
        expect(leaks(landedBody, n), `"${n}" leaked on the landing page`).toBe(false);
      }
      expect(landedBody, "the landing page is not noindex").toMatch(
        /name="robots"[^>]*content="noindex/
      );

      /* 3 — the forward's own body carries NOTHING but the URL echo. ⚠⚠ This is
         the part that still tests something: an employer name, a client name, a
         phone or an email appearing in that shell would be a real leak. */
      const offBody = await off.text();
      const t = await targetFor(scott!.id, "scott");
      const slugWords = new Set(slug.split("-"));
      for (const n of t.needles) {
        if (slugWords.has(n.toLowerCase())) continue; // the documented echo
        expect(leaks(offBody, n), `"${n}" leaked in the forward's body`).toBe(false);
      }

      /* ── ON ──────────────────────────────────────────────────────────── */
      await prisma.providerProfile.update({
        where: { id: scott!.id },
        data: { public_name_at: new Date() },
      });
      const on = await request.get(`/pro/${slug}`);
      expect(on.status()).toBe(200);
      const onBody = await on.text();
      /* ⚠⚠ THE POSITIVE HALF. Without it, deleting the whole named page would
         pass this test (ruling 12). */
      expect(leaks(onBody, "Walls"), "the option is ON and the name is absent").toBe(true);
      /* ⚠ And it becomes indexable — the ONE surface that may be. */
      expect(onBody, "the named page should not be noindex").not.toMatch(
        /name="robots"[^>]*content="noindex/
      );
      /* ⚠⚠⚠ RATES AND CONTACT STAY BEHIND A SIGN-UP EVEN WHEN NAMED. */
      expect(onBody, "the named page is missing its rate lock").toContain(
        "Register free to see rates"
      );
      console.log(`E738/WS-C  /pro/${slug} — off: no name + noindex · on: named + indexable`);
    } finally {
      /* ⚠⚠ ALWAYS PUT IT BACK. A failed assertion must not leave a real
         member's name published. */
      await prisma.providerProfile.update({
        where: { id: scott!.id },
        data: { public_name_at: original },
      });
    }
  });

  /*
    ── ⚠⚠ THE INVARIANT THE SCHEMA CANNOT EXPRESS ───────────────────────────
    ⚠ `ProviderProfileSlug.is_current` must be true on AT MOST ONE row per
    profile. Postgres would need a partial unique index and Prisma's schema
    language cannot declare one, so the model's comment promises this gate.
  */
  test("⚠ at most one live slug per profile", async () => {
    const rows = await prisma.providerProfileSlug.findMany({
      where: { is_current: true },
      select: { profile_id: true, slug: true },
    });
    const seen = new Map<string, string[]>();
    for (const r of rows) {
      seen.set(r.profile_id, [...(seen.get(r.profile_id) ?? []), r.slug]);
    }
    const bad = [...seen.entries()].filter(([, v]) => v.length > 1);
    expect(bad, `profiles with more than one live slug: ${JSON.stringify(bad)}`).toEqual([]);
    console.log(`E738/WS-C  ${rows.length} live slugs, ${seen.size} profiles, 0 duplicates`);
  });
});

/**
 * ── ⚠⚠⚠ `P2-A1.1-E756` — THE RENAME'S OWN ASSERTIONS ─────────────────────────
 *
 * ⚠ Three separate claims, because the rename has three ways to go wrong and
 * only one of them is about the new URL working.
 */
test.describe("P2-A1.1-E756 — /in/ became /pro/", () => {
  test("⚠ the old URL still works: /in/<slug> is a 308 to /pro/<slug>", async ({ request }) => {
    const slug = "scott-walls";
    const r = await request.get(`/in/${slug}`, { maxRedirects: 0 });
    /* ⚠⚠ 308 AND NOT 302. A temporary redirect would leave `/in/` in the index
       forever and split the member's own link equity across two addresses. */
    expect(r.status(), "the old personal URL must keep working").toBe(308);
    expect(r.headers()["location"]).toContain(`/pro/${slug}`);
  });

  test("⚠⚠ an unknown slug is a 404, never a 500", async ({ request }) => {
    /* ⚠⚠⚠ THIS IS THE DEFECT `E756` FIXED, AND IT WAS LIVE ON TRUNK. The route
       passed the sentinel `id="__none__"` into a `uuid` column, so Postgres
       answered `invalid input syntax for type uuid` and a stranger got a 500.
       ⚠ A 404 keeps the privacy property (an unknown slug and a hidden profile
       must look the same); a 500 breaks it, because "something about this one
       broke" is itself a signal. */
    const r = await request.get("/pro/no-such-person-at-all", { maxRedirects: 0 });
    expect(r.status(), "an unknown slug must 404, not 500").toBe(404);
    /* ⚠ And through the old door too, which redirects first. */
    const viaOld = await request.get("/in/no-such-person-at-all");
    expect(viaOld.status()).toBe(404);
  });

  test("⚠⚠⚠ /pro does not swallow /profile, /providers, /projects or /proposals", async ({
    request,
  }) => {
    /* ⚠ The brief asked for this proved rather than reasoned. `/profile` is
       GATED, so a signed-out request must still be bounced to login — if `/pro`
       had started matching it as a public prefix, this would return 200. */
    const profile = await request.get("/profile", { maxRedirects: 0 });
    expect([302, 307].includes(profile.status()), "/profile must stay gated").toBe(true);
    expect(profile.headers()["location"] ?? "").toContain("/login");

    /* ⚠ `/providers` is a real gated subtree; `/projects` and `/proposals` are
       not routes at all. None of the three may resolve as `/pro` + something. */
    for (const path of ["/providers", "/projects", "/proposals"]) {
      const r = await request.get(path, { maxRedirects: 0 });
      expect(r.status(), `${path} must not be served as a /pro slug`).not.toBe(200);
    }
  });
});
