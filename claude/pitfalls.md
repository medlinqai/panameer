# Pitfalls

Bug classes that have bitten before (carried from Medlinq) plus Panameer's
own as they surface. Add a new one with the `pitfall_entry.md` template.

---

## Stale Prisma client / stale dev server (THE #1 false-alarm)

After schema-adjacent changes (new Prisma fields, schema renames, new routes,
redirect-gate changes), the running dev server can hold a **stale Prisma
client**, producing errors that look like real bugs but aren't:

- `[turbopack]_runtime.js` MODULE_NOT_FOUND
- Prisma `P2022` "column does not exist" on a column that WAS migrated

**Fix / rule:** pull → `npx prisma generate` → kill + restart the dev server
→ `rm -rf .next` (Turbopack stale risk). **Verify AFTER restart, never
before** — verifying before restart produces false-negative bug reports. The
"(stale) Turbopack" badge in an error overlay is the tell.

---

## Silent empty list = suspect a 500

A list surface that renders empty is often masking a 500 on the read, not a
genuine "no rows." Fail loud on list reads; surface the error.

---

## Prisma P2022 reads like a `where` bug

A missing-column error surfaces Prisma's error header with the `where`
clause, so a `select` of a not-yet-migrated column reads like a filter/field
bug. Check the migration deployed before debugging the `where`.

---

## App Router: root layout does not re-run after client navigation

The root `layout.tsx` runs on the CURRENT page; after `signIn → router.push`
it does NOT re-run, so anything resolved at login (theme, session-derived
context) can be stale until a hard reload. Client providers must recover on
session-ready, not cache a one-time empty result.

---

> Newest pitfall at top. Keep each entry: symptom → why → fix/rule.
