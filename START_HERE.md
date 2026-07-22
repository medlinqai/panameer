# START HERE — Panameer

> Read this file first at the start of every session. It is meant to be
> self-contained — you should NOT need the prior chat. If it points to another
> file, that file is in this repo. Scott's #1 frustration is losing context
> across sessions; this document exists to prevent that.

---

## 30-second orientation

Scott owns **Panameer Digital Services**. He works with **Claude (chat)** for
planning and briefs, and **Claude Code (CC)** for implementation. Chat writes
briefs; Scott pastes them to CC; CC commits and pushes. **Chat never touches
the repo.** Briefs live in `briefs/`, durable docs in `claude/`, session
continuity in `handoffs/`, SDLC artifacts in `Project Docs/`. The master index
is `CLAUDE.md`. Full collaboration pattern: `claude/working_style.md`.

Stack: Next.js 16 (App Router) · Prisma · Supabase (Postgres) · Resend, on
**port 3100** so it runs alongside Medlinq (3000).

---

## Where things stand (as of 2026-07-22 — PDS 1 kickoff)

This is the very first session. What exists:

- Fresh repo scaffolded (not Medlinq code): Next.js 16 + Tailwind v4 +
  TypeScript strict; Prisma schema with a starter `Profile` model; Supabase
  browser/server clients + `src/proxy.ts` session refresh; Resend
  `sendEmail()`; Zod-validated `env`; `/api/health`; branded landing page.
- Methodology scaffolding stood up: `CLAUDE.md`, this file, the `claude/`
  topic files, `briefs/` + template, `handoffs/`, `Project Docs/` phases.
- Repo target: `github.com/medlinqai/panameer`.

---

## DO THIS FIRST (in order)

1. **Resolve the open auth decision** (`claude/decisions-01.md`): Supabase Auth
   (scaffolded) vs. NextAuth v4 + Prisma 7 / `@prisma/adapter-pg` (Medlinq
   parity). This gates Phase 1. Recommendation on file: match Medlinq.
2. **Define the product** — fill `claude/product_principles.md` (the canonical
   feature filter) and `claude/product_vision.md` (phases). Capture the
   Define-phase work under `Project Docs/1. Define`.
3. **Design** — IA in `claude/navigation_map.md`; mockups in
   `Project Docs/2. Design`.
4. Then the first real **brief** to CC (foundation: auth + data model).

---

## Working-style reminders (so the loop is smooth)

- At CC checkpoints: **the pick + paste-ready text, then STOP.** No long
  reasoning unless asked.
- Decisions stated once and locked (`decisions-NN.md`); don't relitigate.
- When Scott is tired: recommend a path, don't lay out options.
- End of chat → rewrite affected topic files in full (never diffs) + produce a
  `handoffs/HANDOFF_YYYY-MM-DD.md`.
- He signs as **Scott**. Eastern Time.

---

## Files to read next

- `CLAUDE.md` — the index + load-bearing rules.
- `claude/working_style.md` — the full collaboration pattern.
- `claude/decisions-01.md` — what's locked, what's open.
- `claude/deployment.md` — infra, DNS, env vars.
