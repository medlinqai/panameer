# AGENTS.md

Context entry point for coding agents (Claude Code and others).

This folder (`5. Source Code`) is the **code repo** for Panameer — it pushes to
`github.com/medlinqai/panameer`. The methodology/context docs live one level up
in the **`5. Application`** workspace:

- `../CLAUDE.md` — the master index (read this first)
- `../2. Claude Sub-Files/` — the topic files (architecture, conventions,
  decisions-NN, pitfalls, working_style, deployment, …)
- `../1. Briefs/` — CC work orders · `../3. Chat Handoffs/` — session handoffs
- `../4. Project Documents/` — Journeys + Domain Model

Open the **`5. Application`** folder as your workspace so these are all visible.

Key reminders:

- This is **Next.js 16**. Middleware is renamed **Proxy** — auth/route-guard
  code is in `src/proxy.ts`, not `middleware.ts`.
- Auth = **NextAuth v4 credentials + Prisma 7 (`@prisma/adapter-pg`)** — matches
  Medlinq. Access decisions go through `src/lib/access.ts` (Viewer pattern).
- Dev server runs on **port 3100** (coexists with Medlinq on 3000).
- After schema changes: `prisma generate` + restart (`rm -rf .next`) before
  verifying. Stale Prisma client is the #1 false alarm.
- Commit one logical change at a time; always push to `origin/main`.
