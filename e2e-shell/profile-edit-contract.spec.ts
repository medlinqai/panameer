import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

/**
 * ── ⚠⚠⚠ THE PROFILE'S EDIT CONTROLS, BY SHAPE (`P2-A2-E597` WS-D) ─────────
 *
 * ⚠ SCOTT, 2026-09-21: *"Render the owner's profile, collect every Edit
 * control, and for each: it doesn't resolve under /join; it renders 200 inside
 * the profile's frame; and it shows exactly one section. Assert the count is
 * > 0."*
 *
 * ── ⚠⚠ WHY BY SHAPE AND NOT BY A LIST OF SECTIONS ────────────────────────
 *
 * ⚠⚠⚠ A GATE THAT NAMES WHAT IT CHECKS GOES BLIND THE DAY SOMETHING IS ADDED,
 * AND IT GOES BLIND SILENTLY — it keeps passing, on a shrinking fraction of the
 * page. ⚠ `check:review-edit` is the worked example: it read
 * `ProviderProfileView.tsx` for months after `E588` stopped rendering it, and
 * its assertions were true about a file nothing imports.
 * ⚠⚠ MEASURED, AND IT ALREADY EARNED ITS KEEP: this collector found **TEN**
 * controls where WS-C's hand count found NINE. `Add a Service Product` reached
 * `/my-services` and was missed because it carries no `aria-label` — a list
 * written from that count would have been wrong on the day it was written.
 *
 * ── ⚠⚠⚠ IT RENDERS EVERY ONE. THAT IS THE POINT, NOT A DETAIL ────────────
 *
 * ⚠ WS-C's first build passed `tsc` AND `npm run build` and returned **500 on
 * six of the eight editor routes**: the page handed a client component a
 * `SectionSpec`, whose `payload` is a FUNCTION, and functions cannot cross that
 * boundary. ⚠⚠ NEITHER THE COMPILER NOR THE BUILD CAN SEE IT — only rendering
 * can. ⚠⚠⚠ And the two routes that did NOT fail were the two whose payload is
 * `null`, so the damage looked like an unfinished feature rather than a break.
 * ⚠ A STATIC GATE WOULD HAVE PASSED ON ALL EIGHT.
 *
 * ── ⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL ───────────────────────────
 *
 * ⚠⚠ `check:resume` has reported `0 passed, 0 failed, 16 skipped` and EXIT 0
 * for weeks, and has been quoted as green in gate tables. ⚠ So the count is
 * asserted FIRST here: if the profile renders no Edit controls — because the
 * persona lost its profile, or the selector stopped matching — this suite fails
 * loudly instead of passing over an empty list.
 */

/** ⚠ `/profile` is the stable route (`E591`). Where it RESOLVES is free to
    move — it redirects to `/connect` today — and this suite deliberately does
    not care, which is what stops it pinning a redirect the avatar-menu brief
    is about to change. */
const PROFILE = "/profile";

/**
 * ⚠⚠ THE SHAPE: an anchor whose accessible name OPENS with an edit verb.
 * ⚠ `aria-label` FIRST, THEN TEXT — and the fallback is not optional padding:
 * `Add a Service Product` has no `aria-label` at all, and it is exactly the
 * control a name-only collector misses.
 * ⚠⚠⚠ ANCHORED WITH `^`. An unanchored match would sweep in any sentence
 * containing the word "edit", and a collector that over-collects fails on
 * innocent copy — which gets it deleted, which is worse than a narrow one.
 */
const EDIT_VERB = /^(Edit|Add|Manage)\b/i;

type Control = { name: string; href: string };

async function collectEditControls(page: Page): Promise<Control[]> {
  await page.goto(PROFILE, { waitUntil: "domcontentloaded" });
  /* ⚠ The profile's cards hydrate before the owner-only affordances settle. */
  await page.waitForSelector("a[href]");
  await page.waitForTimeout(1200);
  return page.evaluate((src) => {
    const re = new RegExp(src, "i");
    return [...document.querySelectorAll("a[href]")]
      .map((a) => ({
        name: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim(),
        href: a.getAttribute("href") ?? "",
      }))
      .filter((c) => c.href && re.test(c.name));
  }, EDIT_VERB.source);
}

test.describe("⚠⚠⚠ E597 WS-D — every Edit control on the owner's profile", () => {
  test("⚠⚠ the profile offers Edit controls at all (E586 — no inputs must fail)", async ({
    page,
  }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    console.log(
      `E597/WS-D  ${controls.length} edit controls: ` +
        controls.map((c) => `${c.name} → ${c.href}`).join(" · ")
    );
    /* ⚠⚠⚠ THE `E586` ASSERTION. An empty list is a BROKEN GATE, never a pass. */
    expect(
      controls.length,
      "the owner's profile rendered NO edit controls — the persona, the page or the selector is broken, and a suite that passes here is proving nothing (E586)"
    ).toBeGreaterThan(0);
  });

  test("⚠⚠⚠ no Edit control resolves under /join", async ({ page }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    expect(controls.length).toBeGreaterThan(0);
    /*
      ⚠ SCOTT, filing this: *"I went to edit the specializations… and when I
      clicked the edit hyperlink it takes me back to the registration walk. This
      is wrong and presents multiple issues (not the right page, not the right
      menu)."*
      ⚠⚠ THE REDIRECT COUNTS, NOT JUST THE href. A link to `/profile/edit/x`
      that 307s into the wizard would satisfy a text scan and fail the person.
    */
    const offenders: string[] = [];
    for (const c of controls) {
      const target = c.href.split("#")[0];
      if (/^\/join(\/|$|\?)/.test(target)) {
        offenders.push(`${c.name} → ${c.href} (href)`);
        continue;
      }
      await page.goto(target, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const landed = new URL(page.url()).pathname;
      if (/^\/join(\/|$)/.test(landed)) offenders.push(`${c.name} → ${c.href} redirected to ${landed}`);
    }
    expect(offenders, `edit controls still reaching the registration wizard:\n  ${offenders.join("\n  ")}`).toEqual([]);
  });

  test("⚠⚠⚠ every Edit control renders 200 in the profile's frame", async ({ page }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    expect(controls.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const c of controls) {
      const res = await page.goto(c.href.split("#")[0], { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const status = res?.status() ?? 0;
      const frame = await page.evaluate(() => ({
        /* ⚠ The app band — every logged-in page wears it (`E559`). Its absence
           means the page rendered outside the shell, which is the "not the
           right menu" half of the complaint. */
        band: !!document.querySelector("header") || !!document.querySelector("nav"),
        /* ⚠⚠ AND NO CONNECT TAB ROW. A profile editor under a tab row saying
           CONNECT is the same complaint in a new place. */
        connectTabs: /\bCONNECT\b\s*\|/.test(document.body.innerText),
        /* ⚠⚠⚠ A 500 CAN STILL ANSWER 200 in a route that catches its own throw,
           so the error surface is asserted absent as well as the status. */
        errored: /This page couldn.t load|Application error|Unhandled Runtime Error/i.test(
          document.body.innerText
        ),
      }));
      if (status !== 200) bad.push(`${c.name} → ${c.href} returned ${status}`);
      else if (frame.errored) bad.push(`${c.name} → ${c.href} rendered an error page`);
      else if (!frame.band) bad.push(`${c.name} → ${c.href} rendered outside the app shell`);
      else if (frame.connectTabs) bad.push(`${c.name} → ${c.href} rendered under a CONNECT tab row`);
    }
    expect(bad, `edit destinations that did not render in the profile's frame:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  test("⚠⚠⚠ each one-section editor shows exactly one section, and it is the one named", async ({
    page,
  }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    /*
      ── ⚠⚠ THE PARTITION IS MEASURED, NOT ASSUMED ─────────────────────────

      ⚠ Of the ten controls, EIGHT reach `/profile/edit/<slug>` and two reach
      whole pages of their own — `Add a Service Product` → `/my-services` and
      `Manage Account Health` → `/account-health`.
      ⚠⚠ "EXACTLY ONE SECTION" IS A CLAIM ABOUT A ONE-SECTION EDITOR, so it is
      asserted over the first group only. The other two are still held to the
      `/join` and render rules above, which is where they belong.
      ⚠⚠⚠ THE GROUP IS DERIVED FROM THE href, NOT FROM A LIST OF SLUGS — adding
      a ninth section puts it in scope automatically, which is the entire reason
      this suite is shaped this way.
    */
    const editors = controls.filter((c) => /^\/profile\/edit\//.test(c.href));
    console.log(
      `E597/WS-D  ${editors.length} one-section editors of ${controls.length} controls: ` +
        editors.map((c) => c.href.replace("/profile/edit/", "")).join(" · ")
    );
    expect(
      editors.length,
      "no control reached /profile/edit/<section> — the one-section editors are gone or the route moved (E586)"
    ).toBeGreaterThan(0);

    const bad: string[] = [];
    for (const c of editors) {
      await page.goto(c.href.split("#")[0], { waitUntil: "domcontentloaded" });
      await page.waitForSelector("h1");
      await page.waitForTimeout(500);
      const seen = await page.evaluate(() => ({
        h1s: [...document.querySelectorAll("h1")].map((h) => (h.textContent ?? "").trim()),
        /* ⚠ The wizard's stepper must not be here. `E597`'s whole complaint is
           that a one-field edit presented itself as part of a sequence. */
        stepper: /\b\d\s*\/\s*\d\b/.test(document.body.innerText),
        next: [...document.querySelectorAll("button")].some(
          (b) => (b.textContent ?? "").trim() === "Next"
        ),
      }));
      /* ⚠⚠ ONE `<h1>` IS WHAT "EXACTLY ONE SECTION" MEANS ON THE PAGE. Two
         headings would mean two sections mounted, which is the wizard again. */
      if (seen.h1s.length !== 1) {
        bad.push(`${c.href} rendered ${seen.h1s.length} h1s [${seen.h1s.join(" | ")}]`);
        continue;
      }
      /*
        ⚠⚠⚠ AND IT IS THE SECTION THE LINK NAMED. Without this, every editor
        could open the same section and all four assertions above would pass.
        ⚠ The control's own name carries the section — `Edit Specializations` →
        `Specializations` — so the link and the page are checked against each
        other rather than both against a list this gate would have to hold.
      */
      const named = c.name.replace(EDIT_VERB, "").trim().toLowerCase();
      if (seen.h1s[0].toLowerCase() !== named) {
        bad.push(`${c.name} opened "${seen.h1s[0]}" — the link and the page disagree`);
      }
      if (seen.stepper) bad.push(`${c.href} shows a step counter`);
      if (seen.next) bad.push(`${c.href} offers a Next button`);
    }
    expect(bad, `one-section editors that did not show exactly their own section:\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  /*
    ── ⚠⚠⚠ NO LINK ON EITHER PAGE REACHES THE WIZARD (`P2-A2-E600` WS-F) ─────

    ⚠ SCOTT: *"every link on the profile and the Score page, none matching
    /join, count > 0."*
    ⚠⚠ THE TEST ABOVE COLLECTS ONLY **EDIT CONTROLS**. This collects **EVERY
    ANCHOR** on both pages — `E597`'s complaint was never limited to links that
    happen to start with the word "Edit", and the Score page proved it: all 16
    of its action links pointed into `/join/provider` while every Edit control
    on the profile was already correct.
    ⚠⚠⚠ THE COUNT IS ASSERTED FIRST (`E586`). A page that rendered no links at
    all would satisfy "none match /join" perfectly.
  */
  /*
    ── ⚠⚠⚠ EVERY EDITOR OFFERS A WAY IN (`P2-A2-E602` WS-A 4) ───────────────

    ⚠ SCOTT'S WALK (`E016`): `/profile/edit/certifications` rendered *"No
    certifications yet"*, Save and Cancel — **and no way to add one.**

    ⚠⚠⚠ THE ASSERTION IS ABOUT **VISIBLE** CONTROLS, AND THAT IS THE WHOLE
    DESIGN. The broken page had **six `<input>` elements in the DOM** — the
    add/edit modal, rendered but closed — so a naive *"the editor renders an
    input"* check would have PASSED on the exact page Scott filed.
    ⚠⚠ A CONTROL NOBODY CAN REACH IS NOT AN AFFORDANCE. `:visible` is what turns
    this from a DOM census into a statement about what a person can do.

    ⚠ BY SHAPE (`E587`): every `/profile/edit/*` editor must offer at least one
    of — a visible text input, a visible select, or a visible `Add …` trigger.
    It names no section, so a new editor joins the rule by existing.
  */
  test("⚠⚠⚠ every one-section editor offers a visible way to enter a value", async ({
    page,
  }) => {
    await signIn(page);
    const controls = await collectEditControls(page);
    const editors = controls.filter((c) => /^\/profile\/edit\//.test(c.href));
    /* ⚠⚠ `E586` — a run with no editors would pass vacuously. */
    expect(editors.length, "E586: no one-section editors found").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const c of editors) {
      await page.goto(c.href, { waitUntil: "domcontentloaded" });
      /*
        ⚠⚠⚠ WAIT FOR THE EDITOR'S **BODY**, NOT FOR `main`. `SectionEditorClient`
        fetches `/api/onboarding/status` and renders nothing but the header until
        it resolves — so `waitForSelector("main")` returns on the `<h1>` and
        measures an empty page.
        ⚠⚠ THIS WAS MEASURED THE WRONG WAY FIRST AND REPORTED **ALL FOURTEEN
        EDITORS AS BROKEN**, including `title`, which has a visible input. ⚠ A
        gate that fails everything is not a gate finding fourteen bugs, it is a
        gate measuring the wrong moment — and it would have been "confirmed" by
        the one page that genuinely was broken.
        ⚠ Every editor renders a Save control once loaded, so that is the signal.
      */
      /*
        ⚠⚠ `:visible` IS LOAD-BEARING HERE, NOT TIDINESS. Without it `.first()`
        matched the CLOSED MODAL's Save on `/profile/edit/certifications` — the
        very modal this workstream exists to make reachable — and waited 30s for
        a hidden button to appear. ⚠ The page's own Save is later in DOM order.
      */
      await page
        .locator('main button:visible:has-text("Save"), main button:visible:has-text("Done")')
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      const counts = await page.evaluate(() => {
        const seen = (el: Element) => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
        };
        const main = document.querySelector("main") ?? document.body;
        const fields = [...main.querySelectorAll("input, textarea, select")].filter(seen).length;
        const adders = [...main.querySelectorAll("button, a")].filter(
          (el) => seen(el) && /(^|\s)\+?\s*add\b/i.test(el.textContent ?? "")
        ).length;
        /* ⚠ A picker made of buttons counts too — `role`, `work-method` and
           `languages` are chips and cards, not inputs, and they are real ways
           to enter a value. */
        const pickers = [...main.querySelectorAll("button[aria-pressed]")].filter(seen).length;
        /*
          ⚠⚠⚠ A FILE INPUT IS **CONVENTIONALLY HIDDEN**, and that is not the
          defect this test hunts. `PhotoUpload` renders
          `<input type="file" class="hidden">` and drives it from a visible
          button through a ref — which is the normal way to style an upload.
          ⚠⚠ COUNTING ONLY VISIBLE FIELDS FAILED `photo`, A PAGE THAT WORKS.
          ⚠ So it counts as a way in when the hidden file input is paired with a
          visible button — the button being what a person actually clicks.
        */
        /*
          ⚠⚠⚠ THE INPUT MAY BE HIDDEN; ITS **PARENT** MAY NOT BE. That single
          condition is what separates the two cases, and getting it wrong cost a
          mutation round: counting any file input made the CERTIFICATIONS defect
          pass, because the closed add-modal contains an *Attach PDF or Image*
          input. ⚠⚠ THE ACCOMMODATION FOR `photo` HAD QUIETLY OPENED A HOLE
          UNDER `certifications` — the exact page this workstream fixes.
          ⚠ `PhotoUpload`'s hidden input sits in a VISIBLE card; the modal's sits
          in a hidden dialog. Reachability is the property, not visibility.
        */
        const uploads = [...main.querySelectorAll('input[type="file"]')].filter(
          (el) => el.parentElement != null && seen(el.parentElement)
        ).length;
        return { fields, adders, pickers, uploads };
      });
      const ok = counts.fields > 0 || counts.adders > 0 || counts.pickers > 0 || counts.uploads > 0;
      console.log(
        `E602/WS-A  ${c.href.replace("/profile/edit/", "").padEnd(16)} ` +
          `fields=${counts.fields} add=${counts.adders} pickers=${counts.pickers} upload=${counts.uploads} ${ok ? "ok" : "⚠ NO WAY IN"}`
      );
      if (!ok) offenders.push(`${c.href} — nothing visible to enter a value with`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  /*
    ── ⚠⚠⚠ AND THE SAVE PATH ACCEPTS THE STEP (`P2-A2-E602` WS-A 4) ─────────

    ⚠ THE PREVIOUS TEST PROVES YOU CAN TYPE. THIS ONE PROVES IT CAN LAND — and
    they are genuinely different defects. `/profile/edit/certifications` had a
    visible modal full of fields whose Save returned
    **`{"error":"Unknown step"}`, a 400**, because `SAVEABLE_STEPS` never listed
    the step its own handler implements.
    ⚠⚠⚠ THREE OF FOURTEEN EDITORS COULD NOT SAVE AT ALL — `certifications`,
    `photo` and `work_method` — AND TWO OF THEM SHIPPED IN `E600` WS-F, whose
    save proof covered `title` only. **One section proved is not the section
    set proved.**

    ⚠⚠ IT POSTS THE PROFILE'S **CURRENT** VALUES BACK, so every request is a
    NO-OP: nothing is created, nothing is torn down, and the gate persona is
    untouched. ⚠ It asserts only that the step is ROUTABLE — a domain
    validation like *"Add at least one language"* is the handler working and is
    accepted here, because this test is about the whitelist, not the rules.
  */
  test("⚠⚠⚠ every section's save path is routable — no Unknown step", async ({ page }) => {
    await signIn(page);
    const steps = await page.evaluate(async () => {
      const r = await fetch("/api/onboarding/status");
      const s = await r.json();
      const p = s.profile ?? {};
      return [
        ["title", { headline: p.headline ?? "" }],
        ["roles", { roleTypeIds: p.roleTypeIds ?? [], roleTypeId: p.roleTypeId ?? null }],
        ["photo", { photoUrl: p.photoUrl ?? null }],
        ["finish", { address: p.address ?? null, phone: p.phone ?? null }],
        ["languages", { languages: p.languages ?? [] }],
        ["work_method", { workMethod: p.workMethod ?? null }],
        ["certifications", { certifications: p.certifications ?? [] }],
        ["bio", { overview: p.overview ?? "" }],
        ["specializations", { specializationIds: p.specializationIds ?? [] }],
        ["education", { education: p.education ?? [] }],
      ] as [string, unknown][];
    });
    /* ⚠⚠ `E586` — no steps means nothing was asserted. */
    expect(steps.length, "E586: no steps to probe").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const [step, data] of steps) {
      const res = await page.evaluate(async ([s, d]) => {
        const r = await fetch("/api/onboarding/provider/step", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ step: s, data: d }),
        });
        return { status: r.status, body: (await r.text()).slice(0, 120) };
      }, [step, data] as [string, unknown]);
      const unknown = /Unknown step/i.test(res.body);
      console.log(`E602/WS-A  save ${String(step).padEnd(16)} ${res.status} ${unknown ? "⚠ UNKNOWN STEP" : "routable"}`);
      if (unknown) offenders.push(`${step} → ${res.status} ${res.body}`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  test("⚠⚠⚠ no link on the profile or the Score page reaches /join", async ({ page }) => {
    await signIn(page);
    const offenders: string[] = [];
    let total = 0;
    for (const route of [PROFILE, "/community/score"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("a[href]");
      await page.waitForTimeout(1200);
      const links = await page.evaluate(() =>
        [...document.querySelectorAll("a[href]")].map((a) => ({
          name: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim(),
          href: a.getAttribute("href") ?? "",
        }))
      );
      total += links.length;
      for (const l of links) {
        if (/^\/join(\/|$|\?)/.test(l.href)) offenders.push(`${route}: ${l.name} → ${l.href}`);
      }
    }
    /* ⚠⚠ COUNT FIRST — the absence check below is worthless on an empty page. */
    expect(
      total,
      "neither page rendered any links — the persona, the routes or the selector is broken (E586)"
    ).toBeGreaterThan(0);
    expect(
      offenders,
      `links still reaching the registration wizard:\n  ${offenders.join("\n  ")}`
    ).toEqual([]);
    console.log(`E600/WS-F  ${total} links across /profile and /community/score, 0 into /join`);
  });
});