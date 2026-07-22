# Navigation Map

The authoritative information architecture: top-level areas → sections →
pages → which roles see what. Keep this as the single source of truth for
nav so surfaces don't drift.

> **Status: skeleton.** Build during Design, alongside the mockups in
> `Project Docs/2. Design`.

---

## Top-level areas

_The rail / primary nav. One row per area, with the role(s) that can reach it._

| Area | Route | Roles | Notes |
|---|---|---|---|
| Home | `/` | all | landing |
| Health | `/api/health` | — | liveness check |

## Back-nav rule

_State the rule once (Medlinq's: app-home surfaces have no back button;
drill-downs get a top-left back affordance with a parent-keyed label).
Decide Panameer's and lock it here._

## Page inventory

_Route → purpose → primary component → access. Grow as pages land._
