# Architecture

System design, data model, tenancy, and identity for Panameer. This is the
one topic file nearly every task needs — keep it current.

> **Status: skeleton.** Filled during the Define/Design phase. Sections below
> are the expected shape (mirrors Medlinq's architecture doc); replace the
> placeholders with Panameer's real design as decisions land in
> `decisions-01.md`.

---

## System overview

_What Panameer is, at a system level: the app, its data store (Supabase
Postgres via Prisma), email (Resend), hosting (Vercel). One paragraph +
a simple box diagram when ready._

## Tenancy model

_Is Panameer multi-tenant? If so, what is the tenant fence and how is it
derived from the session? (See the tenant-fence pattern in `conventions.md`.)
If single-tenant, say so explicitly so no one adds a fence that isn't needed._

## Identity & auth

_Auth approach is OPEN (Supabase Auth vs NextAuth v4 — see `decisions-01.md`).
Once locked: session shape, where user identity lives, how `Profile` relates
to the auth user, roles._

## Data model

_Core entities and relationships. Today: `Profile` (keyed to the Supabase auth
user id) + `Role` enum. Grow this as the model is designed._

## Access control

_The Viewer/access pattern (`src/lib/access.ts`): every query helper takes a
`viewer` first arg; all access decisions centralized. Define the roles and
what each can see/do._

## Integrations

_Resend (email), Supabase Storage (files), any third parties. Note which env
vars each needs (see `deployment.md`)._
