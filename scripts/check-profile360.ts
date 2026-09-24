import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `check:profile360` (`P2-A2-E616` WS-C) ──────────────────────────
 *
 * ⚠⚠ `E598`'s LESSON IS THE WHOLE POINT OF THIS FILE. `check:visitor-profile`
 * had six cases and a hole exactly where the owner's own provider page sat — a
 * union with a gap in the middle. **Adding a viewer class does not add a case,
 * it multiplies them**, so the matrix below is DERIVED and intersected rather
 * than listed (`E587`).
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

/** ⚠ Rule 12 / `E164`: a quote is not live code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.tsx?$/.test(f)) out.push(f);
  }
  return out;
}
const SRC = walk("src");

const VIEW = join("src", "lib", "provider-profile-view.ts");
const view = strip(readFileSync(VIEW, "utf8"));

/* ── 1 · ⚠⚠⚠ EVERY PROFILE SURFACE IS GATED — DERIVED FROM THE SURFACE ────
   ⚠ The population is every route that reads a profile, found by the read, not
   by a list. ⚠⚠ Count > 0 (`E586`). */
const profileSurfaces = SRC.filter((f) => {
  if (!f.startsWith(join("src", "app"))) return false;
  const b = strip(readFileSync(f, "utf8"));
  return /getProviderProfileView\(|getPublicProviderProfile\(/.test(b);
});
check(
  "1 — the profile-surface scan found surfaces (E586)",
  profileSurfaces.length > 0,
  `${profileSurfaces.length} — a scan with no inputs is not a check`
);
for (const f of profileSurfaces) {
  const b = strip(readFileSync(f, "utf8"));
  /*
    ⚠⚠⚠ EVERY SURFACE REFUSES A CALLER WITH NO SESSION. Measured 2026-09-24:
    `/api/providers/[id]` returned **HTTP 200 with an unmasked surname and the
    provider's rates** to a signed-out `curl`, while the page beside it
    redirected the same caller to `/login`. **The door was locked and the
    window was open.**
    ⚠ A page redirects, an API returns 401 — both are refusals, and this
    asserts one of them is present.
  */
  check(
    `1 — ${f} refuses a caller with no session`,
    /if \(!viewer\)/.test(b) && /(redirect\(|status: 401)/.test(b),
    "a profile is not a public document — E049 decided that for the page"
  );
}

/* ── 2 · ⚠⚠⚠ ONE RATE RULE, EVERYWHERE (ruling 9) ────────────────────────
   ⚠ Scott, 2026-09-24: *"ONE RULE, EVERYWHERE — this governs every surface a
   rate renders on, not only the peer view."*

   ⚠⚠ THE POPULATION IS API ROUTES THAT SERVE SOMEBODY ELSE'S PROFILE, and the
   assertion is that each reads through the ONE view model. ⚠⚠⚠ MY FIRST
   VERSION SCANNED FOR ANY `rates:` PAYLOAD AND CRIED WOLF ON TWO CORRECT
   FILES: `lib/types.ts` merely DECLARES the shape, and `lib/me.ts` emits the
   viewer's OWN rate, which the owner may always see. **A gate that fails on
   correct code is a gate somebody switches off**, and that is the fourth time
   that shape has bitten in this run. */
const profileApiRoutes = SRC.filter(
  (f) =>
    f.startsWith(join("src", "app", "api")) &&
    f.endsWith("route.ts") &&
    /getProviderProfileView\(|getPublicProviderProfile\(/.test(strip(readFileSync(f, "utf8")))
);
check(
  "2 — the profile-API scan found routes (E586)",
  profileApiRoutes.length > 0,
  `${profileApiRoutes.length}`
);
for (const f of profileApiRoutes) {
  const b2 = strip(readFileSync(f, "utf8"));
  /*
    ⚠⚠⚠ MEASURED 2026-09-24: this route used `getPublicProviderProfile`, a
    SECOND decider carrying its own `isOwner` and **none** of the redactions —
    no surname mask, no contact gate, no client-name gate, and no rate test at
    all. Signed out it returned HTTP 200 with `lastName: "Walls"` and
    `rates: { onsiteCents: 12500, remoteCents: 9000 }`.
    ⚠ One concept in two places is free to drift, and this one had drifted all
    the way to serving what the other withholds.
  */
  check(
    `2 — ${f} reads through the one view model`,
    /getProviderProfileView\(/.test(b2) && !/getPublicProviderProfile\(/.test(b2),
    "a second profile builder applies none of the redactions the first exists for"
  );
  check(
    `2 — ${f} passes the whole viewer, not just an id`,
    /viewer,/.test(b2),
    "every redaction downstream asks a capability of the viewer; an id decides nothing"
  );
}
/* ⚠⚠ AND THE RULE ITSELF IS STATED ONCE in the view model. Two call sites of
   the capability test would be two places to change it. */
check(
  "2 — the capability test appears once in the view model",
  (view.match(/canHireTalent/g) ?? []).length === 1,
  `${(view.match(/canHireTalent/g) ?? []).length} occurrences — one rule means one place`
);

/* ── 3 · ⚠⚠ PROFILE360 — THE OWNER CAN PREVIEW THE PEER VIEW ─────────────
   ⚠ Ruling 11: the name stays `Profile360`. */
const PAGE = join("src", "app", "(app)", "providers", "[id]", "page.tsx");
const pageRaw = readFileSync(PAGE, "utf8");
const page = strip(pageRaw);
check("3 — the profile route carries a peer preview", /previewAsPeer/.test(page));
check(
  "3 — and it is owner-only by construction",
  /profile\.isOwner && wantsPeerPreview/.test(page),
  "a stranger appending ?as=provider must change nothing"
);
check(
  "3 — the control is named Profile360 (ruling 11)",
  /Profile360/.test(pageRaw),
  "Scott's word stands"
);
/* ⚠⚠⚠ THE PREVIEW ANSWERS THE EXISTING PREDICATE, IT DOES NOT ADD A SECOND.
   A `hideRate` boolean here would be exactly the second rule §2 exists to
   forbid. */
check(
  "3 — the preview feeds the one rate rule rather than a second one",
  /rates: opts\.previewAsPeer \|\| !\(/.test(view) && !/hideRate|suppressRate/.test(view),
  "the preview answers the capability question as that viewer, it does not fork the rule"
);

/* ── 4 · ⚠⚠ THE WAY BACK, AND THE WAY ACROSS (`E602`'s lesson) ───────────
   ⚠ A link that drops a member into a walk they cannot leave is a defect. */
check(
  "4 — the owner bar offers a way back to My Profile",
  /href="\/profile"/.test(pageRaw) && /Back to My Profile/.test(pageRaw)
);
check(
  "4 — and a way across between the two previews",
  /\?as=provider/.test(pageRaw) && /See What Buyers See/.test(pageRaw),
  "two views of one idea should not live in two different places (E585)"
);
/* ⚠⚠ AND THE BAR NAMES WHICH VIEW IT IS. With two previews on one route,
   a fixed label would be false half the time. */
check(
  "4 — the bar names which view this is",
  /This Is How Other Providers See You/.test(pageRaw) &&
    /This Is How Buyers See You/.test(pageRaw),
  "a preview that misnames itself is worse than no preview"
);

/* ── 5 · ⚠⚠⚠ THE OWNER PREVIEWING THEMSELVES WRITES NO VIEW ROW ─────────
   ⚠ Viewing a profile is a WRITE (`E598`). A member checking their own peer
   view must not inflate their own count. ⚠⚠ The rule lives in
   `profile-views.ts` and reads the RAW `isOwner`, which is why the preview
   cannot defeat it — asserted here so a future edit cannot quietly change it. */
const VIEWS = join("src", "lib", "profile-views.ts");
const views = strip(readFileSync(VIEWS, "utf8"));
check(
  "5 — recordProfileView refuses the owner",
  /if \(opts\.isOwner\) return;/.test(views),
  "the owner's own visit is not a view"
);
check(
  "5 — and the route passes the RAW isOwner, not the preview-folded one",
  /isOwner: profile\.isOwner/.test(page),
  "folding the preview in here would let an owner inflate their own count"
);

console.log(`check:profile360 — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
for (const f of fails) console.log(`\n  ✗ ${f}`);
if (fails.length) process.exit(1);
