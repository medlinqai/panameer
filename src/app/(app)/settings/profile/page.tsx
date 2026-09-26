import { permanentRedirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ THE PROFILE VISIBILITY SECTION IS DELETED (ruling 78) ───────────
 *
 * ⚠ **RULING 78 SUPERSEDES 74's *"the other four stay"*.** Project Preference,
 * Linked Accounts, AI Data Training, Earnings Privacy **and** Categories are
 * deleted; **Visibility moves to My Profile**; the section and its rail item go.
 *
 * ⚠⚠ **A 308 RATHER THAN A 404, BECAUSE A BOOKMARK IS A DOOR.** The one control
 * anybody came here for now lives on `/profile`, so that is where this lands —
 * **it does not send them to an index and make them hunt.**
 *
 * ── ⚠⚠ WHAT LEFT WITH IT, AND WHY NOTHING IS STRANDED ───────────────────
 *
 * ⚠ **`ProfileSettingsForm` IS NOT DELETED** (`E164`) — it is simply no longer
 * mounted, and its five deleted cards are quoted inside it.
 * ⚠⚠⚠ **`CompletenessChecklist` RETIRES EXACTLY AS PLANNED, AND THE CODEBASE
 * SAID SO IN ADVANCE.** `completeness.ts` carries the note: *"THIS FUNCTION AND
 * `CompletenessChecklist.tsx` ARE BOTH RETIRED WHEN `/community/score` SHIPS
 * (WS-B). They are kept working until then so `/settings/profile` is not left
 * with a hole and nowhere to link."* ⚠ `/community/score` has shipped and is a
 * tab in the Account Information row; **this page was its last mount.** So the
 * checklist is not being dropped — **its successor is live and this is the
 * moment the note was written for.**
 *
 * ── ⚠⚠⚠ THE COLUMNS ARE NOT DROPPED ────────────────────────────────────
 *
 * ⚠ `project_preference`, `earnings_private`, `ai_training_opt_in`,
 * `linked_github` and `linked_stackoverflow` remain on `ProviderProfile`.
 * ⚠⚠ **DROPPING A COLUMN IS A DESTRUCTIVE SCHEMA CHANGE** (ruling 41b — *a
 * rename is `DROP`+`ADD` and is never free, however empty the table*), and this
 * brief has no schema window. ⚠⚠⚠ **THEY ARE NOW ORPHANED — WRITTEN BY NOTHING
 * AND READ BY NOTHING — AND THAT IS RECORDED RATHER THAN TIDIED**, because
 * removing them is its own decision with its own migration.
 * ⚠ `updateProfileSettings` still ACCEPTS them, so nothing throws; it simply
 * has no caller for those keys any more.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this page was:
 * //   PROFILE SETTINGS (J2.4 WS-H / E015).
 * //   Visibility · Project preference · Earnings privacy (Plus) · Categories ·
 * //   Linked accounts · AI data-training preference.
 */
export default function ProfileSettingsRetired() {
  permanentRedirect("/profile");
}
