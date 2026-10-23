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
- ⚠ **Title Case on every UI label — Scott's standing rule, don't make him ask.** Buttons, links that act,
  page/section headings, tabs, step names, chips and column headers: "Your Matches", "Star the Ones You Like",
  "Request Availability from Your Shortlist". Sentences (help text, descriptions) stay sentence case. Full rule:
  `../2. Claude Sub-Files/conventions.md` › "UI copy — Title Case for all labels". Check every string you add.
- **Job → Request → Order (Scott 2026-10-23; Shop: Cart → Request → Order):** screen words only — never "Work Request",
  "Service Requisition" or "Work Order" on screen ("Change Order" stays). Numbers RQ-… and OR-… (older WR-/WO- stay). Code names
  (`WorkRequest`, `WorkOrder`, `/work-requests`) stay. ERP payloads and admin ERP screens keep Requisition / Purchase Order.
