# AGENTS.md

Context entry point for coding agents (Claude Code and others).

**Read `CLAUDE.md` first** — it's the index to everything: the load-bearing
rules, the `claude/` topic files, and the phase status.

Key reminders:

- This is **Next.js 16**. Middleware is renamed **Proxy** — auth/session code
  lives in `src/proxy.ts`, not `middleware.ts`. APIs and conventions may
  differ from older Next.js; when unsure, check `node_modules/next/dist/docs/`.
- The dev server runs on **port 3100** (coexists with Medlinq on 3000).
- After schema changes: `prisma generate` + restart (`rm -rf .next`) before
  verifying. Stale Prisma client is the #1 false alarm (`claude/pitfalls.md`).
- Commit one logical change at a time; always push to `origin/main`.
