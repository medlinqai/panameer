import type { ScoreLine } from "@/lib/completeness";
import type { SectionSlug } from "@/lib/profile-sections";

/**
 * ── ⚠⚠ THE SCORE PAGE'S PER-LINE COPY, IN ONE PLACE (`P2-J3-E590` WS-B) ────
 *
 * ⚠ `why` is the one line under a step saying why the line matters. `action` is
 * the label on the link that fixes it, and `href` is where that link goes.
 * ⚠⚠ SEPARATE FROM `completeness.ts` ON PURPOSE: that module is the ARITHMETIC
 * and is imported by the scorer, the admin board and two gates. Copy and routes
 * do not belong in a file those three depend on.
 *
 * ── ⚠ `minutes` IS AN ESTIMATE AND IS LABELLED AS ONE ──────────────────────
 *
 * ⚠⚠ IT IS NOT MEASURED AND MUST NOT BE PRESENTED AS MEASURED. The page always
 * says *"about N minutes"*. ⚠ These are deliberately small and round; the point
 * is to say *"this is short"*, not to predict anybody's afternoon.
 *
 * ── ⚠ `To` STAYS LOWERCASE IN SENTENCE COPY (walk item, 2026-09-20) ────────
 */
export type LineCopy = {
  why: string;
  action: string;
  href: string;
  minutes: number;
  /**
   * ⚠⚠⚠ THE `E597` ONE-SECTION EDITOR FOR THIS LINE, WHERE ONE EXISTS.
   *
   * ⚠ MEASURED 2026-09-22: **every `href` in this table still points into
   * `/join/provider`** — the registration wizard — which is the exact complaint
   * `E597` was written to fix: *"I clicked the edit hyperlink and it takes me
   * back to the registration walk. This is wrong."*
   * ⚠⚠ `E597` WS-C BUILT EIGHT ONE-SECTION EDITORS at `/profile/edit/<slug>`,
   * and this maps each score line onto one WHERE THERE IS ONE.
   * ⚠⚠⚠ THE LINES WITH NO EDITOR KEEP THEIR `href`: `headline`, `field`,
   * `photo`, `identity`, `location`, `languages` and `work_method`. The profile
   * renders no Edit control for any of them — `E597` WS-C measured that there
   * is no `Edit Title` link — so there is nothing to point at, and inventing an
   * editor is not this brief. ⚠ **Reported at the WS-C gate.**
   */
  editorSlug?: SectionSlug;
};

export const SCORE_LINE_COPY: Record<ScoreLine["key"], LineCopy> = {
  // ── So Buyers Can Find You ────────────────────────────────────────────────
  headline: {
    why: "The one line buyers scan before anything else",
    action: "Add a Title",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  field: {
    why: "It decides which searches you appear in",
    action: "Pick Your Role",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  skills: {
    why: "Buyers filter on skills more than on any other field",
    action: "Add Your Skills",
    href: "/join/provider?step=catalog&return=review",
    minutes: 3,
    editorSlug: "skills",
  },
  rate: {
    why: "A profile with no rate is filtered out before it is read",
    action: "Set Your Rate",
    href: "/join/provider?step=finish",
    minutes: 1,
    editorSlug: "rates",
  },
  photo: {
    why: "A face is the difference between a record and a person",
    action: "Add a Photo",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  identity: {
    why: "Your address and phone — how work reaches you",
    action: "Add Your Contact Details",
    href: "/join/provider?step=finish",
    minutes: 2,
  },

  // ── Who You Are ──────────────────────────────────────────────────────────
  overview: {
    why: "Your own words, where a buyer decides whether to read on",
    action: "Write Your Bio",
    href: "/join/provider?step=finish",
    minutes: 4,
    editorSlug: "bio",
  },
  location: {
    why: "Buyers filter by where you are, even for remote work",
    action: "Say Where You're Based",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  languages: {
    why: "It decides which buyers can work with you",
    action: "Add a Language",
    href: "/join/provider?step=education&return=review",
    minutes: 1,
  },
  experienceYears: {
    why: "Dates on your work are what turn a list into a career",
    action: "Date a Job or a Project",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 2,
    editorSlug: "work-history",
  },
  workMethod: {
    why: "Buyers filter on this more than anything after rate",
    action: "Say How You Work",
    href: "/join/provider?step=finish",
    minutes: 1,
  },

  // ── What You've Done — every line declarable ─────────────────────────────
  workHistory: {
    why: "The first thing a buyer reads on your profile",
    action: "Add a Job",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 4,
    editorSlug: "work-history",
  },
  education: {
    why: "A qualification, if you hold one",
    action: "Add a Qualification",
    href: "/join/provider?step=education&return=review",
    minutes: 2,
    editorSlug: "education",
  },
  specializations: {
    why: "The systems and processes you know best",
    action: "Pick Your Specializations",
    href: "/join/provider?step=specializations&return=review",
    minutes: 2,
    editorSlug: "specializations",
  },
  certifications: {
    why: "Proof somebody else checked your work",
    action: "Add a Certification",
    href: "/join/provider?step=finish",
    minutes: 2,
    editorSlug: "certifications",
  },
  soloProjects: {
    why: "Work you did on your own account, outside a job",
    action: "Add a Project",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 3,
    editorSlug: "solo-projects",
  },
};

/** ⚠ The rider under a line the provider answered with "I have none". */
export const DECLARED_NONE_RIDER = "you told us you have none";
