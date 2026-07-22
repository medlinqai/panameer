# Decisions — 01 (ACTIVE)

Locked decisions for Panameer, newest at top. This is the ACTIVE file in the
numbered series; when it exceeds ~2500 lines, freeze it and start
`decisions-02.md`. To read the full log, read every `decisions-NN.md` in
ascending order.

---

## 2026-07-22 — Project kickoff (PDS 1)

### LOCKED

- **Port 3100.** The Panameer app dev/start server runs on port 3100 so it
  coexists with Medlinq (port 3000). Set in `package.json` (`next dev -p 3100`
  / `next start -p 3100`).
- **Next.js 16 → Middleware is "Proxy."** Next 16 renamed the Middleware file
  convention to `proxy.ts`. Auth session refresh lives in `src/proxy.ts`
  (not `middleware.ts`). Same functionality, new name.
- **Supabase connection strings.** Prisma uses the pooled connection
  (`DATABASE_URL`, port 6543, `?pgbouncer=true`) at runtime and the direct
  connection (`DIRECT_URL`, port 5432) for migrations.
- **Repo.** Code lives at `github.com/medlinqai/panameer`. Same GitHub-first,
  Vercel-deploy, Supabase-Postgres, Resend-email infra as Medlinq. Domain
  `panameer.com` registered via GoDaddy (DNS on GoDaddy). Hosting/Hostinger
  role: TBD (see `deployment.md`).

### OPEN — needs Scott's call

- **Auth approach.** The scaffold ships **Supabase Auth** (`@supabase/ssr`).
  Medlinq actually runs **NextAuth v4 (credentials) + Prisma 7 with
  `@prisma/adapter-pg`**. Decision: match Medlinq (maximizes reuse of the
  Viewer/access pattern, conventions, pitfalls) vs. keep Supabase Auth
  (simpler, fewer moving parts). This gates `conventions.md` auth section and
  the `src/lib/access.ts` shape. **Recommendation on file: match Medlinq**
  unless Scott wants to simplify.
- **Prisma version.** Follows the auth decision — Prisma 7 + `@prisma/adapter-pg`
  (Medlinq parity) vs. Prisma 6 (current scaffold).

---

> Format for new entries: date header → LOCKED bullets (one line each, with
> the "why" only if load-bearing) → OPEN questions. Never relitigate a LOCKED
> decision without a new dated entry that supersedes it.
