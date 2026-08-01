/**
 * Review-page validation (brief_X / E056) — Scott's "changes vs errors" split.
 *
 *   ERRORS  (hard) — Panameer MUST resolve these before Publish. They disable
 *                    the Publish button and each carries a click-to-fix action.
 *   CHANGES (soft) — the provider MAY want to fix these. Never blocking; they
 *                    are the difference between a publishable profile and a
 *                    profile that actually wins work.
 *
 * ---------------------------------------------------------------------------
 * THE GATE IS NOT RE-DECIDED HERE.
 *
 * `errors` is a strict MIRROR of the server-side gate in `publishProfile`
 * (`lib/onboarding.ts`) — same conditions, same order, phrased as fixes instead
 * of as a sentence. It exists so the review page can disable Publish and point
 * at the offending field, NOT to add rules: the server stays authoritative and
 * a client that skipped this check gets exactly the same refusal.
 *
 * If `publishProfile`'s required list changes, change THIS LIST TOO — the two
 * drifting apart shows up as a Publish button that is enabled and then fails,
 * which is worse than either behaviour on its own.
 *
 * Everything else the profile could want — address, work history, education,
 * certifications, specializations, an un-dated role — is a CHANGE. Those feed
 * `completeness` (and so the 80% visibility threshold), but they have never
 * blocked publishing and this layer does not start.
 *
 * The PHOTO is the exception, promoted to an ERROR in the WS7 addendum. It is
 * still a 10-point scored field in `completeness.ts` and the weights there are
 * untouched — a profile with no photo still scores 100. The requirement lives in
 * the publish gate ALONE, which is the honest place for it: completeness answers
 * "how strong is this profile", the gate answers "may it go live at all".
 * ---------------------------------------------------------------------------
 */

/** Minimum bio length — mirrors MIN_BIO_CHARS in onboarding.ts (E017). */
export const MIN_BIO_CHARS = 100;

/** Where a click-to-fix sends the provider. */
export type ReviewFix =
  /** Jump to another wizard step. */
  | { kind: "step"; step: string }
  /** Focus a field on the review page itself (the identity block). */
  | { kind: "field"; field: ReviewField }
  /** Open the certifications modal. */
  | { kind: "certifications" }
  /** Open the photo upload modal. */
  | { kind: "photo" };

export type ReviewField =
  | "dateOfBirth"
  | "phone"
  | "line1"
  | "city"
  | "state"
  | "postalCode";

export type ReviewItem = {
  /** Stable key for React and for the click-to-fix anchor. */
  id: string;
  severity: "error" | "change";
  /** Imperative and specific — "Add your hourly rate", not "Rate missing". */
  message: string;
  /** The label on the click-to-fix control. */
  fixLabel: string;
  fix: ReviewFix;
};

/** The slice of the wizard draft this layer reads. */
export type ReviewInput = {
  headline: string;
  overview: string;
  hourlyRateCents: number | null;
  pillarId: string | null;
  roleTypeId: string | null;
  skillIds: string[];
  languages: unknown[];
  dateOfBirth: string | null;
  phone: string;
  photoUrl: string | null;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  employers: { id: string; name: string; startDate: string | null }[];
  /**
   * Projects with no `role_type_id` (brief_project_model_v2). The column is
   * nullable so an IMPORT can leave a project honestly unclassified instead of
   * being assigned a guessed role; this is where the provider gets told about
   * it. Soft — an unclassified project still publishes.
   */
  unclassifiedProjects?: number;
  education: unknown[];
  certifications: unknown[];
  specializations: unknown[];
};

export function reviewItems(p: ReviewInput): ReviewItem[] {
  const items: ReviewItem[] = [];
  const err = (
    id: string,
    message: string,
    fixLabel: string,
    fix: ReviewFix
  ) => items.push({ id, severity: "error", message, fixLabel, fix });
  const chg = (
    id: string,
    message: string,
    fixLabel: string,
    fix: ReviewFix
  ) => items.push({ id, severity: "change", message, fixLabel, fix });

  // --- ERRORS — the publishProfile gate, condition for condition ------------
  if (!p.headline.trim()) {
    err("headline", "Add a professional title.", "Add title", {
      kind: "step",
      step: "title",
    });
  }
  if (p.overview.trim().length < MIN_BIO_CHARS) {
    err(
      "overview",
      p.overview.trim().length === 0
        ? "Write a bio — at least 100 characters."
        : `Your bio is ${p.overview.trim().length} characters; it needs at least ${MIN_BIO_CHARS}.`,
      "Write bio",
      { kind: "step", step: "bio" }
    );
  }
  if (p.hourlyRateCents == null) {
    err("rate", "Set your hourly rate.", "Set rate", {
      kind: "step",
      step: "rate",
    });
  }
  // Server checks `pillar_id` — the Domain half of the Role → Domain pair.
  if (!p.pillarId) {
    err("field", "Choose the work you do.", "Choose work", {
      kind: "step",
      step: "catalog",
    });
  }
  if (p.skillIds.length === 0) {
    err("skills", "Add at least one skill.", "Add skills", {
      kind: "step",
      step: "catalog",
    });
  }
  if (p.languages.length === 0) {
    err("languages", "Add at least one language.", "Add language", {
      kind: "step",
      step: "languages",
    });
  }
  if (!p.dateOfBirth) {
    err("dateOfBirth", "Add your date of birth.", "Add date of birth", {
      kind: "field",
      field: "dateOfBirth",
    });
  }
  if (!p.phone.trim()) {
    err("phone", "Add your phone number.", "Add phone", {
      kind: "field",
      field: "phone",
    });
  }
  // `.trim()` mirrors the server's `!p.photo_url?.trim()` exactly. Without it a
  // whitespace-only value would enable Publish here and be refused there, which
  // is the precise drift this file's header warns about.
  if (!p.photoUrl?.trim()) {
    err("photo", "Add a profile photo to publish.", "Add photo", {
      kind: "photo",
    });
  }

  // --- CHANGES — optional, and each one is worth money ---------------------
  // The address is part of the completeness identity block (DOB + address +
  // phone) that carries 10 points toward the 80% visibility threshold, so a
  // missing one is worth flagging — but it has never blocked publishing.
  const a = p.address;
  const addressMissing = !a || !a.line1.trim() || !a.city.trim() || !a.state.trim() || !a.postalCode.trim();
  if (addressMissing) {
    chg(
      "address",
      "Complete your address — it counts toward becoming visible to buyers.",
      "Add address",
      { kind: "field", field: !a?.line1.trim() ? "line1" : "city" }
    );
  }

  // A work-history entry with no start date renders as "? – Present" on the
  // live profile, which reads as broken data.
  //
  // EMPLOYERS, never "roles" (WS4). "Role" is reserved twice over — security
  // roles, and the catalog's Role -> Domain -> Skill — so using it for a job
  // someone held makes two different things share one word in a product that
  // shows both to the same person.
  const undated = p.employers.filter((e) => !e.startDate);
  if (undated.length > 0) {
    chg(
      "employer-dates",
      undated.length === 1
        ? `${undated[0].name} has no start date — it will show as "? – Present".`
        : `${undated.length} employers have no start date — they will show as "? – Present".`,
      "Add dates",
      { kind: "step", step: "tell_us" }
    );
  }

  const unclassified = p.unclassifiedProjects ?? 0;
  if (unclassified > 0) {
    chg(
      "project-roles",
      unclassified === 1
        ? "1 project has no role set — classifying it is how buyers find it."
        : `${unclassified} projects have no role set — classifying them is how buyers find them.`,
      "Classify projects",
      { kind: "step", step: "tell_us" }
    );
  }

  if (p.employers.length === 0) {
    chg(
      "employers",
      "Add your work history — providers with it are twice as likely to win work.",
      "Add work history",
      { kind: "step", step: "tell_us" }
    );
  }
  if (p.education.length === 0) {
    chg("education", "Add your education.", "Add education", {
      kind: "step",
      step: "education",
    });
  }
  if (p.specializations.length === 0) {
    chg(
      "specializations",
      "Add specializations so buyers can find you by what you focus on.",
      "Add specializations",
      { kind: "step", step: "specializations" }
    );
  }
  if (p.certifications.length === 0) {
    chg(
      "certifications",
      "Add a certification — credentials increase your chances of getting hired.",
      "Add certification",
      { kind: "certifications" }
    );
  }

  return items;
}

export function splitReviewItems(items: ReviewItem[]) {
  return {
    errors: items.filter((i) => i.severity === "error"),
    changes: items.filter((i) => i.severity === "change"),
  };
}
