
export const MIN_BIO_CHARS = 100;
export const MAX_BIO_CHARS = 600;

/** Where a click-to-fix sends the provider. */
export type ReviewFix =
  /** Jump to another wizard step. */
  | { kind: "step"; step: string }
  /** Focus a field on the review page itself (the identity block). */
  | { kind: "field"; field: ReviewField }
  /** Open the certifications modal. */
  | { kind: "certifications" }
  /** Open the photo upload modal. */
  | { kind: "photo" }
  /** Scroll to the résumé company sorter on the review page. */
  | { kind: "sortCompanies" };

export type ReviewField =
  | "overview"
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
  phone: string;
  photoUrl: string | null;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  employers: { id: string; name: string; startDate: string | null }[];
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
  if (p.overview.trim().length > MAX_BIO_CHARS) {
    err(
      "overview",
      `Your bio is ${p.overview.trim().length} characters — trim it to ${MAX_BIO_CHARS} or fewer.`,
      "Trim bio",
      { kind: "field", field: "overview" }
    );
  }
  if (p.hourlyRateCents == null) {
    err("rate", "Set your onsite or offsite rate.", "Set rates", {
      kind: "step",
      step: "rate",
    });
  }
  // THE ROLE is the answer now, not the (Role, Domain) pair: the domain left the
  if (!p.roleTypeId) {
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
  // Languages and date of birth are NOT errors any more — neither is prompted
  // and neither gates publish. Languages remains a suggestion below; DOB is
  // gone from the product entirely (WS7).
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

  // CHANGES — optional, and each one is worth money ---------------------
  if (p.overview.trim().length === 0) {
    chg("overview-empty", "Add a bio later — clients like to see one.", "Write bio", {
      kind: "field",
      field: "overview",
    });
  }
  // The address is part of the REQUIRED set now (contact), so it is an error
  // rather than a suggestion — see below.
  const a = p.address;
  const addressMissing = !a || !a.line1.trim() || !a.city.trim() || !a.state.trim() || !a.postalCode.trim();
  if (addressMissing) {
    err(
      "address",
      "Complete your address — buyers need somewhere to reach you.",
      "Add address",
      { kind: "field", field: !a?.line1.trim() ? "line1" : "city" }
    );
  }

  // A work-history entry with no start date cannot show a span on the live
  const undated = p.employers.filter((e) => !e.startDate);
  if (undated.length > 0) {
    chg(
      "employer-dates",
      undated.length === 1
        // entry may be a CURRENT role, where the past tense reads wrong
        ? `${undated[0].name} has no start date — the profile can't show how long this role lasted.`
        : `${undated.length} employers have no start date — the profile can't show how long these roles lasted.`,
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
      "Add your work history later — providers with it are twice as likely to win work.",
      "Add work history",
      { kind: "step", step: "tell_us" }
    );
  }
  if (p.education.length === 0) {
    chg("education", "Add your education later — clients like to see it.", "Add education", {
      kind: "step",
      step: "education",
    });
  }
  if (p.specializations.length === 0) {
    chg(
      "specializations",
      "Add specializations later — it's how buyers find you by what you focus on.",
      "Add specializations",
      { kind: "step", step: "specializations" }
    );
  }
  if (p.certifications.length === 0) {
    chg(
      "certifications",
      "Add a certification later — credentials increase your chances of getting hired.",
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
