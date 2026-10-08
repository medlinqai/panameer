# Beginners videos — Phase 1 (read-only) · 2026-10-08

## Paths
| Path | Slug | Group | Status | Courses | Lessons | With video | Enrollments | Path group |
|---|---|---|---|---:|---:|---:|---:|---|
| Oracle Cloud Foundations | oracle-cloud-foundations | Foundational Learning Paths | PUBLISHED | 4 | 53 | 25 | 2 | yes |
| Beginners | end-user-beginners | — | PUBLISHED | 1 | 1 | 0 | 0 | yes |
| ERP | end-user-erp | — | PUBLISHED | 1 | 1 | 0 | 0 | yes |
| Implementers | end-user-implementers | — | PUBLISHED | 1 | 1 | 0 | 0 | yes |

The OneDrive `1. Beginners` folder's four course folders (Background · Overview · Roles & Careers · Login & Get Started) are the four courses of **Oracle Cloud Foundations**; the "Beginners" path is a one-lesson stub that points at it.

## Vimeo token
`/oauth/verify` → scope `private public` — **no `upload` (or `edit`) scope**. Uploads are blocked until a token with `upload` + `edit` is put in `.env.local`.

## Mapping (Oracle Cloud Foundations; "Has video" = a Vimeo id is already on the lesson)
| File (`3. Final`) | MB | Course › lesson | Has video | Decision |
|---|---:|---|---|---|
| 1. Background/1. What is IaaS/What is IaaS.mp4 | 371 | Background › What is IaaS? | 1044682886 | already linked — skip |
| 1. Background/2. What is PaaS/What is PaaS.mp4 | 402 | Background › What is PaaS? | 1044683093 | already linked — skip |
| 1. Background/3. What is SaaS/What is SaaS.mp4 (not "OLD …") | 711 | Background › What is SaaS? | 1044683364 | uncertain (may already be this cut) — skip, list |
| 1. Background/4. …/NEW What is an ERP Application.mp4 | 765 | Background › What is an ERP Application? | 1044683781 | NEW; uncertain whether linked video is NEW — skip, list |
| 1. Background/5. …/NEW Quick History of ERP Applications.mp4 | 947 | Background › The History of ERP Applications? | 1044684220 | NEW; uncertain — skip, list |
| 1. Background/6. …/NEW The Rise of the Offshore Worker.mp4 | 441 | Background › The Rise of the Offshore Worker | 1044684864 | NEW; uncertain — skip, list |
| 2. Overview/…/1. What is Oracle Cloud/NEW What is Oracle Cloud_1.mp4 | 466 | Overview › 2.1 What is Oracle Cloud? | 1054816305 | NEW; uncertain — skip, list |
| 2. Overview/…/_Fusion vs Oracle Cloud.mp4 | 132 | Overview › 2.2 | 1059383079 | already linked — skip |
| 2. Overview/…/When was oracle Cliud Created.mp4 | 147 | Overview › 2.3 | 1059384172 | already linked — skip |
| 2. Overview/…/How is Oracle Cloud Organized.mp4 | 304 | Overview › 2.4 | 1059384304 | already linked — skip |
| 2. Overview/…/How to access Oracle Cloud Instances.mp4 | 259 | Overview › 2.5 | 1059384360 | already linked — skip |
| 2. Overview/…/What are the End User Training Options for Oracle CLoud .mp4 | 359 | Overview › 2.6 | 1059384406 | already linked — skip |
| 2. Overview/…/How is oracle Cloud Secured .mp4 | 173 | Overview › 2.7 | 1059384472 | already linked — skip |
| 2. Overview/…/Is Oracle Cloud Multi-Tenant.mp4 | 1035 | Overview › 2.8 | 1054817015 | already linked — skip |
| 2. Overview/…/9. Oracle Cloud Users/Manage Users.mp4 | 511 | Overview › 2.9 | 1054820414 | already linked — skip |
| 2. Overview/3. SaaS/ERP Pillar/ERP Pillar .mp4 | 597 | Overview › What is Oracle Cloud ERP Pillar? | 1054821492 | already linked — skip |
| **4. Login & Get Started/1. What is Demo Services/What is demo services.mp4** | 197 | Login › What is Demo Services? | — | **approved — upload** |
| **4. Login & Get Started/2. Navigation/How to Navigate Oracle Cloud .mp4** | 403 | Login › How to Navigate Oracle Cloud | — | **approved — upload** |
| 2. Overview/…/9. Oracle Cloud Users/LinkedIn Primer.mp4 | 26 | — | — | unmatched — skip |

Lessons with no final file: Overview course overview, CX/EPM/SCM/HCM Pillar, 7 technology lessons after OTBI, What is OCI; Background "How Panameer Builds & Supports Talent"; Roles & Careers course overview, 2.3, 4.1–4.6 (consulting `3. Final` folders empty); Login course overview (raw only), Set Defaults, Redirect Workflow, End of the Learning Path.

## Recommendation (not done — Scott decides)
**Merge, don't rename:** keep Oracle Cloud Foundations (slug, 2 enrollments, 25 videos, group); unpublish Beginners and 308 `/learn/end-user-beginners` → `/learn/oracle-cloud-foundations`. Beginners has 0 enrollments, so nothing is lost; renaming would create a second Oracle Cloud Foundations.
