# Event Behavior

The system-event spec: what happens when X occurs — notifications, downstream
tasks, emails, any AI handling per event.

> **Status: skeleton.** In Medlinq the canonical source is a spreadsheet
> (`briefs/*_notification_events.xlsx`) with this file as the framing. Decide
> whether Panameer needs the same, and if so point at the sheet here.

---

## Framing

_How to read the event spec: columns, what each event row defines
(trigger → recipients → channel → template → downstream task)._

## Events

| Event | Trigger | Recipients | Channel | Notes |
|---|---|---|---|---|
| — | — | — | — | _none defined yet_ |

## Email templates

_Where transactional templates live (`src/lib/email/templates/` or similar)
and which event fires each. Email sends go through `src/lib/resend.ts`._
