# Conventions

Naming, file layout, and code patterns for Panameer. Carries over the
transferable patterns from Medlinq; stack-specific sections are marked
where they depend on the open auth decision (see `decisions-01.md`).

---

## Stack (current)

- Next.js 16 (App Router, TypeScript strict)
- Tailwind CSS v4
- Prisma (PostgreSQL) — see `decisions-01.md` for the Prisma-version /
  adapter decision (Medlinq uses Prisma 7 + `@prisma/adapter-pg`; the
  Panameer scaffold currently ships Prisma 6 — OPEN).
- Supabase (Postgres; storage)
- Auth — OPEN: Supabase Auth (`@supabase/ssr`) as scaffolded, vs.
  NextAuth v4 credentials to match Medlinq. See `decisions-01.md`.
- Resend (transactional email)
- Zod (input + env validation)

---

## File layout

```
src/
  app/                  ← App Router routes
    api/                ← route handlers (e.g. /api/health)
  lib/                  ← shared server/client utilities
    env.ts              ← validated environment access (import `env`, not process.env)
    prisma.ts           ← PrismaClient singleton
    resend.ts           ← Resend client + sendEmail() helper
    supabase/           ← client.ts (browser), server.ts (RSC/actions), proxy.ts (session refresh)
  proxy.ts              ← Next.js 16 "Proxy" (formerly Middleware) — auth session refresh
prisma/
  schema.prisma         ← data model
```

---

## Carried patterns (from Medlinq — keep these)

- **Viewer / access pattern.** All access decisions go through helpers in a
  single `src/lib/access.ts`. Query helpers take a `viewer` as their first
  argument, even when unused. Never inline-check roles in components.
- **Tenant fence (if multi-tenant).** Every business query filters by the
  tenant id derived from the session, never from the request body. Data
  never crosses tenant boundaries. (Confirm Panameer's tenancy model in
  `architecture.md` before applying.)
- **Fail loud on list reads.** A silently empty list = suspect a 500. Don't
  swallow read errors.
- **Restart-before-verify.** New Prisma fields, new routes, redirect-gate
  changes, and schema renames require `prisma generate` + a full dev-server
  restart (`rm -rf .next` for stale Turbopack). Stale Prisma client / stale
  dev server is the #1 false-alarm source. See `pitfalls.md`.
- **Env access is centralized.** Import `env` from `src/lib/env.ts`; do not
  reach into `process.env` in feature code.

---

## Naming

- Files: kebab-case for routes, camelCase for lib utilities, PascalCase for
  components.
- Prisma models: PascalCase singular; `@@map` to snake_case plural table
  names; columns `@map` to snake_case.
- Env vars: `NEXT_PUBLIC_*` only for values safe in the browser.

---

## Commits

- One logical change per commit. Clear message. Always push to
  `origin/main`. A step is not done until committed AND pushed.

---

> This file is a living skeleton. Expand it as real patterns are set during
> Define/Design/Build. Rewrite in full (never patch) per `working_style.md`.
