# UI Patterns / Phase UI

Reusable UI templates, theming, and component conventions. (Named to mirror
Medlinq's `phase_3_ui.md`; rename per Panameer's phase language if desired.)

> **Status: skeleton.** Fill during Design/Build. Authoritative nav lives in
> `navigation_map.md`; this file is about page templates and visual system.

---

## Page templates

_The handful of layout templates surfaces are built from (e.g. list template,
detail template, wizard template). Define them so pages stay consistent._

## Theming / tokens

_Brand tokens (colors, spacing, type). If tenants get their own theming,
describe how it resolves. Note the App Router pitfall: client theme providers
must recover on session-ready, not cache a one-time result (see `pitfalls.md`)._

## Component conventions

_Shared components and when to use them. For UI briefs, instruct CC to match
existing in-repo components and brand tokens rather than inventing new ones._
