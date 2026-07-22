# Demo Data

Seeded accounts, users, and the demo cast used for development and walks.

> **Status: skeleton.** Populate once the data model exists and a seed script
> is written (`prisma/seed.ts`). Mirrors Medlinq's demo_data doc.

---

## Seed cast

_Named personas (with roles) that the seed creates, so walks are reproducible.
Include the exact expected counts so "silent empty list" (a 500) is
distinguishable from "genuinely zero."_

| Persona | Role | Notes |
|---|---|---|
| — | — | _none seeded yet_ |

## Seed accounts / tenants

_If multi-tenant: the demo tenants and what distinguishes them._

## How to seed

_Command + any prerequisites (env, migrations applied). Keep the restart rule
in mind — regenerate the Prisma client after schema changes._
