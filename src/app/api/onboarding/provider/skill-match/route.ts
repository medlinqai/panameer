import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { didYouMean, matchSkill } from "@/lib/skill-match";

/**
 * GET /api/onboarding/provider/skill-match?q=… — does this skill already exist?
 * (`P1-J1.4-E298`)
 *
 * ⚠⚠ THIS EXISTS BECAUSE A SERVER CANNOT ASK A QUESTION. The rule is that an
 * exact-ish match links silently and a NEAR match ASKS — and the save path has
 * nobody to ask. So the wizard asks HERE, before it submits, running the SAME
 * `matchSkill` the write path runs. ⚠ ONE MATCHER, TWO CALLERS, NO SECOND
 * IMPLEMENTATION: `check:field-quality` asserts there is only one.
 *
 * ⚠ IT MATCHES THE WHOLE CATALOG, not the current role's skills. The wizard's
 * own `skillOpts` list is scoped to the picked role, and the duplicate Scott hit
 * was a row that exists under a DIFFERENT role — a role-scoped match would have
 * missed exactly the case this is for.
 *
 * ⚠ A READ, AND IT CHANGES NOTHING. No row is created, linked or renamed here;
 * the answer is advice for the client. Signed-in only, because the catalog is
 * behind the app, but it is not owner-scoped — there is nothing of the viewer's
 * in it.
 */
export async function GET(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (!q) return NextResponse.json({ kind: "none" });

  /*
    ── ⚠⚠⚠ SUGGESTIONS COME FROM THE **ACTIVE CATALOGUE** ONLY (`E602` WS-B) ──

    ⚠ SCOTT, 2026-09-22: *"Legacy rows stay for existing data but are never
    offered to someone typing a new skill. That closes 'Did you mean purchase
    requisitons?' at the source instead of fixing one row while 700 others can
    do the same thing."*

    ⚠⚠ `OFFERABLE` IS `{ status: "ACTIVE" }` — A STATUS, NOT A SCOPE. This route
    asked the whole `skill` table, so every row in the retired `ERP` catalogue
    was a candidate. ⚠⚠⚠ THAT IS THE `E483` DEFECT ON A NEW SITE, and the one
    the codebase already names: *"`OFFERABLE` is status-only, no catalog scope."*

    ⚠ MEASURED: `catalog/skills` (via `offerScope`) and `skill-suggestions` (via
    `activeCatalogId`) WERE ALREADY SCOPED. **This route was the only gap** —
    which is why the picker looked right and the *"did you mean"* did not.
    ⚠⚠ `activeCatalogId()` BY CODE, NEVER `findFirst()` (`E483`), the same call
    `skill-suggestions` makes.
    ⚠⚠⚠ A `null` id DEGRADES TO THE OLD, WIDER BEHAVIOUR rather than matching
    nothing — `offerScope`'s own rule: *"an empty picker is a worse failure than
    a wide one."* ⚠ A never-seeded database must not silently stop suggesting.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   where: OFFERABLE,
  */
  const catalogId = await activeCatalogId();
  const rows = await prisma.skill.findMany({
    /* ⚠ `E481` — a retired skill is never suggested. */
    where: catalogId ? { ...OFFERABLE, catalog_id: catalogId } : OFFERABLE,
    select: { id: true, name: true, is_custom: true },
  });
  /* ⚠ `is_custom` -> `isCustom`. A BASELINE catalog row outranks a
     provider-authored one when suggesting — see `lib/skill-match.ts`. */
  const candidates = rows.map((c) => ({ id: c.id, name: c.name, isCustom: c.is_custom }));
  const m = matchSkill(q, candidates);

  if (m.kind === "exact") {
    return NextResponse.json({ kind: "exact", skill: m.skill });
  }
  if (m.kind === "near") {
    /* ⚠ THE PROMPT COMES FROM THE SHARED MODULE so the sentence has one home. */
    return NextResponse.json({
      kind: "near",
      skill: m.skill,
      typed: m.typed,
      prompt: didYouMean(m.skill.name),
    });
  }
  return NextResponse.json({ kind: "none" });
}
