# CLAUDE.md

This is the root context file for the **Panameer** codebase. It is
intentionally **thin** — a table of contents, the load-bearing rules, and
phase status. Detailed content lives in topic files under `claude/`.

If you (Claude or Claude Code) are starting fresh on this repo, read this
file first, then load the topic files relevant to your current task.

---

## What is Panameer

Panameer Digital Services — a web application built fresh (not copied from
Medlinq) on the same stack family and the same working methodology. Product
thesis and principles are captured in `claude/product_principles.md` and
`claude/product_vision.md` (both being defined; PDS 1 kickoff).

Owner/decision-maker: **Scott** (Eastern Time). Collaboration model: Claude
(chat) architects and writes briefs; **Claude Code (CC) implements and
commits; chat never touches the repo.** Full pattern: `claude/working_style.md`.

---

## How to use this directory

```
CLAUDE.md                    ← you are here; the index
START_HERE.md                ← front door for each new session (read first)
claude/
  product_principles.md      ← the canonical feature filter (READ FIRST for product work)
  product_vision.md          ← phases, roadmap, build-faster
  architecture.md            ← system design, data model, tenancy, identity (most tasks need this)
  conventions.md             ← naming, file layout, code patterns, stack
  pitfalls.md                ← bug classes that have bitten before  (+ pitfall_entry.md template)
  decisions-NN.md            ← locked decisions, NUMBERED SERIES (read all in order; -01 is active)
  bugs-NN.md                 ← error matrix, NUMBERED SERIES (read all in order; -01 is active)
  working_style.md           ← how Scott + Claude + CC collaborate
  deployment.md              ← hosting, DNS, environments, secrets
  briefs_and_audit.md        ← brief format + audit trail
  navigation_map.md          ← authoritative IA / nav map
  phase_3_ui.md              ← UI templates, theming, component conventions
  demo_data.md               ← seeded cast + expected counts
  event_behavior.md          ← system-event spec (notifications, emails, tasks)
briefs/                      ← CC work orders (audit trail; never thrown away) + _template.md
handoffs/                    ← HANDOFF_YYYY-MM-DD.md cross-session context
Project Docs/                ← SDLC phases: 1. Define → 2. Design → 3. Build → 4. Test → 5. Deploy → 6. Support
```

**Routing rule:** load only the topic files your task touches. Most tasks need
2–4, not all. `architecture.md` is the one nearly every task needs.

**Numbered-file series (decisions, bugs) — read/write rule.** The series are
flat files `decisions-01.md`, `decisions-02.md`, … (zero-padded). Read every
file in ascending order for the full log. The **highest-numbered file is the
ACTIVE file** and the only one edited; lower numbers are frozen archives. When
the active file exceeds ~2500 lines, freeze it and start the next number.
(Panameer starts at `-01`.)

---

## Load-bearing rules

1. **Chat never commits.** All code reaches the repo via CC's commits. Chat
   writes briefs to `briefs/` using `briefs/_template.md`. Briefs are the
   audit trail and are never thrown away. See `briefs_and_audit.md`.

2. **A step isn't done until committed AND pushed to `origin/main`,** with the
   commit hash reported back. "Done locally" is not done.

3. **Access decisions go through `src/lib/access.ts`** (the Viewer pattern) —
   never inline role checks in components. See `conventions.md`.

4. **Patches batch at end-of-chat.** Don't edit CLAUDE.md/topic files
   one-by-one mid-conversation. Collect changes; at "end chat," rewrite
   affected files **in full** as drop-in replacements (never diffs), then
   produce the handoff. See `working_style.md`.

5. **When in doubt about a current fact, read the file — don't trust memory.**
   `decisions-NN.md`, `built_inventory.md`, and the actual code are the truth.
   A stated root-cause can be wrong; verify against diffs. "Reported done" ≠
   landed; verify.

---

## Phase status

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Scaffold + methodology | In progress | PDS 1: Next.js 16 + Prisma + Supabase + Resend on port 3100; methodology scaffolding stood up |
| Phase 1 — Foundation (auth, data model, tenancy) | Not started | Gated on the auth decision (see below) |
| Phase 2+ | Not started | See `product_vision.md` |

### Open decisions (see `decisions-01.md`)

- **Auth approach** — Supabase Auth (scaffolded) vs. NextAuth v4 + Prisma 7 /
  `@prisma/adapter-pg` (Medlinq parity). Recommendation on file: match Medlinq.
- **Prisma version** — follows the auth decision.
- **Hostinger role** — confirm what (if anything) Hostinger hosts vs. Vercel.

---

## Stack at a glance

- Next.js 16 (App Router) — **Middleware is renamed "Proxy"** (`src/proxy.ts`)
- Prisma (PostgreSQL) — version/adapter per the open decision
- Supabase (Postgres; storage; possibly auth)
- Tailwind CSS v4
- TypeScript strict
- Resend (transactional email)
- Zod (input + env validation)

## Environment note

- App runs on **port 3100** (`npm run dev`) to coexist with Medlinq (3000).
- Copy `.env.example` → `.env.local`. Import env via `src/lib/env.ts`.
- **Restart-before-verify:** after schema changes / new routes, run
  `prisma generate` + restart the dev server (`rm -rf .next`). Stale Prisma
  client is the #1 false-alarm source. See `pitfalls.md`.
