import type { ScoreLine } from "@/lib/completeness";

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
};

export const SCORE_LINE_COPY: Record<ScoreLine["key"], LineCopy> = {
  // ── So Buyers Can Find You ────────────────────────────────────────────────
  headline: {
    why: "The one line buyers scan before anything else",
    action: "Add a title",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  field: {
    why: "It decides which searches you appear in",
    action: "Pick your role",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  skills: {
    why: "Buyers filter on skills more than on any other field",
    action: "Add your skills",
    href: "/join/provider?step=catalog&return=review",
    minutes: 3,
  },
  rate: {
    why: "A profile with no rate is filtered out before it is read",
    action: "Set your rate",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  photo: {
    why: "A face is the difference between a record and a person",
    action: "Add a photo",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  identity: {
    why: "Your address and phone — how work reaches you",
    action: "Add your contact details",
    href: "/join/provider?step=finish",
    minutes: 2,
  },

  // ── Who You Are ──────────────────────────────────────────────────────────
  overview: {
    why: "Your own words, where a buyer decides whether to read on",
    action: "Write your bio",
    href: "/join/provider?step=finish",
    minutes: 4,
  },
  location: {
    why: "Buyers filter by where you are, even for remote work",
    action: "Say where you're based",
    href: "/join/provider?step=finish",
    minutes: 1,
  },
  languages: {
    why: "It decides which buyers can work with you",
    action: "Add a language",
    href: "/join/provider?step=education&return=review",
    minutes: 1,
  },
  experienceYears: {
    why: "Dates on your work are what turn a list into a career",
    action: "Date a job or a project",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 2,
  },
  workMethod: {
    why: "Buyers filter on this more than anything after rate",
    action: "Say how you work",
    href: "/join/provider?step=finish",
    minutes: 1,
  },

  // ── What You've Done — every line declarable ─────────────────────────────
  workHistory: {
    why: "The first thing a buyer reads on your profile",
    action: "Add a job",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 4,
  },
  education: {
    why: "A qualification, if you hold one",
    action: "Add a qualification",
    href: "/join/provider?step=education&return=review",
    minutes: 2,
  },
  specializations: {
    why: "The systems and processes you know best",
    action: "Pick your specializations",
    href: "/join/provider?step=specializations&return=review",
    minutes: 2,
  },
  certifications: {
    why: "Proof somebody else checked your work",
    action: "Add a certification",
    href: "/join/provider?step=finish",
    minutes: 2,
  },
  soloProjects: {
    why: "Work you did on your own account, outside a job",
    action: "Add a project",
    href: "/join/provider?step=tell_us&return=review",
    minutes: 3,
  },
};

/** ⚠ The rider under a line the provider answered with "I have none". */
export const DECLARED_NONE_RIDER = "you told us you have none";
