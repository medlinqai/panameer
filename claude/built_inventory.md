# Built Inventory

What's built (do not rebuild), by area. Keep this current so future sessions
don't re-implement shipped work. Newest at top.

---

## 2026-07-22 — Initial scaffold (PDS 1)

**Do not rebuild.** The repo was scaffolded fresh (not copied from Medlinq)
with the same stack family.

- **Framework:** Next.js 16 (App Router, TypeScript strict), Tailwind v4.
- **Port:** dev/start on 3100 (`package.json`).
- **Prisma:** `prisma/schema.prisma` with a `Profile` model (`id` = Supabase
  auth user id) + `Role` enum; datasource wired for pooled `DATABASE_URL` +
  `DIRECT_URL`. (Prisma 6 currently — see the open version decision.)
- **Supabase clients:** `src/lib/supabase/client.ts` (browser),
  `server.ts` (RSC/actions/route handlers), `proxy.ts` (session refresh).
- **Auth session refresh:** `src/proxy.ts` (Next 16 Proxy convention).
- **Email:** `src/lib/resend.ts` — Resend client + `sendEmail()` helper.
- **Env:** `src/lib/env.ts` — Zod-validated, non-fatal in dev.
- **Prisma client:** `src/lib/prisma.ts` — singleton.
- **Route:** `GET /api/health` — liveness check.
- **Landing page:** `src/app/page.tsx` — branded placeholder.
- **Methodology scaffolding:** `CLAUDE.md`, `START_HERE.md`, `claude/*`
  sub-files, `briefs/` (+ template + index), `handoffs/` (+ template),
  `Project Docs/` (1. Define → 6. Support).

**Not yet built:** real auth flows, data model beyond `Profile`, any product
surfaces. Those follow the Define/Design phase.

---

> Entry format: date → "do not rebuild" list by area. When something is
> replaced, note the supersession rather than deleting the history.
