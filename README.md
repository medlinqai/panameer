# Panameer Digital Services

A web app built with the same stack and architectural concepts as Medlinq —
**Next.js (App Router) · Prisma · Supabase · Resend** — as a fresh, independent
codebase. It runs on **port 3100** so it can run side by side with Medlinq
(port 3000) without conflict.

## Stack

| Concern        | Tool                                  |
| -------------- | ------------------------------------- |
| Framework      | Next.js 16 (App Router, TypeScript)   |
| Styling        | Tailwind CSS v4                        |
| ORM            | Prisma 6 (PostgreSQL)                 |
| Database + Auth| Supabase                              |
| Email          | Resend                                |
| Validation     | Zod                                   |

## Project structure

```
src/
  app/
    api/health/route.ts   # liveness check at /api/health
    layout.tsx
    page.tsx              # landing page
  lib/
    env.ts               # validated environment access
    prisma.ts            # PrismaClient singleton
    resend.ts            # Resend client + sendEmail() helper
    supabase/
      client.ts          # browser client (Client Components)
      server.ts          # server client (Server Components / Actions / Route Handlers)
      proxy.ts           # session-refresh helper used by proxy.ts
  proxy.ts               # Next.js 16 "Proxy" (formerly Middleware) — keeps auth session fresh
prisma/
  schema.prisma          # Profile model keyed to Supabase auth user id
.env.example             # copy to .env.local and fill in
```

> **Next.js 16 note:** Middleware was renamed to **Proxy**. The auth-session
> refresh logic lives in `src/proxy.ts` (not `middleware.ts`).

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

   This also runs `prisma generate` automatically (postinstall).

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase URL/keys, the `DATABASE_URL` / `DIRECT_URL` connection
   strings, and your Resend API key. See `.env.example` for exactly where each
   value comes from.

3. **Set up the database schema**

   ```bash
   npm run db:push          # push the Prisma schema to Supabase (quick start)
   # or, once you want migration history:
   npm run prisma:migrate   # create and apply a migration
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3100>. The health check is at
   <http://localhost:3100/api/health>.

## Running side by side with Medlinq

The two projects are fully independent — separate folders, separate `.env`,
separate Supabase projects, and separate ports:

| Project                    | Port | Command             |
| -------------------------- | ---- | ------------------- |
| Medlinq                    | 3000 | `npm run dev`       |
| Panameer Digital Services  | 3100 | `npm run dev`       |

Open a terminal in each folder and run `npm run dev` — both servers run at the
same time and never collide. Switch between them just by opening
`localhost:3000` or `localhost:3100`.

> If you also run **Supabase locally** (via the Supabase CLI) for each project,
> give each one its own port range in that project's `supabase/config.toml` so
> the local stacks don't clash either. Using separate hosted Supabase projects
> (the default here) avoids that entirely.

## Scripts

| Script                   | What it does                          |
| ------------------------ | ------------------------------------- |
| `npm run dev`            | Start dev server on port 3100         |
| `npm run build`          | Production build                      |
| `npm run start`          | Start production server on port 3100  |
| `npm run lint`           | Run ESLint                            |
| `npm run typecheck`      | Type-check with `tsc --noEmit`        |
| `npm run prisma:generate`| Regenerate the Prisma client          |
| `npm run prisma:migrate` | Create + apply a migration            |
| `npm run prisma:studio`  | Open Prisma Studio                    |
| `npm run db:push`        | Push schema to the database           |
