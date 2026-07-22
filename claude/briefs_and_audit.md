# Briefs & Audit

How briefs work, the brief format, and the running audit trail of what was
asked of Claude Code (CC) and when.

---

## What a brief is

A brief is a markdown **work order** that Claude (chat) writes and Scott
pastes to CC. Briefs are the audit trail of what CC was asked to do. **Briefs
are never thrown away.** They live in `briefs/`, named
`brief_<N>_<short_description>.md`.

- Chat writes the brief. Chat does not talk to CC directly and does not
  commit. (See `working_style.md`.)
- CC reads `CLAUDE.md` + the relevant `claude/` topic files + the brief.
  Anything discussed only in chat but not written into the brief, CC does not
  know — put the full behavior in the brief, not just chat.

## Brief format

Use `briefs/_template.md`. Every brief states:

1. **Status** — ACTIVE | DRAFT | BLOCKED (+ "small, ~15 min" when tiny).
2. **Blocker for** — what landing this unblocks.
3. **Context** — the minimum CC needs; link topic files rather than re-explaining.
4. **Acceptance criteria** — a checkbox list, each item verifiable.
5. **Out of scope** — what NOT to touch.
6. **Report back** — commit hash(es), verification results, deviations.

Multi-day work splits into `brief_<X>_day_1_<topic>.md`, etc.

---

## Audit trail

Newest at top. One row per brief once it ships (with commit hash).

| Brief | Title | Status | Commit(s) |
|---|---|---|---|
| — | _none yet_ | — | — |

---

> The chronological handoffs in `handoffs/` narrate sessions; this file is the
> brief-level index. `built_inventory.md` is the "what exists now" view.
