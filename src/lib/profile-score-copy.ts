import type { ScoreLine } from "@/lib/completeness";
import type { SectionSlug } from "@/lib/profile-sections";

export type LineCopy = {
  why: string;
  action: string;
  href: string;
  minutes: number;
  editorSlug?: SectionSlug;
};

export const SCORE_LINE_COPY: Record<ScoreLine["key"], LineCopy> = {
  // ── So Buyers Can Find You ────────────────────────────────────────────────
  headline: {
    why: "The one line buyers scan before anything else",
    action: "Add a Title",
    href: "/join/provider?step=finish",
    minutes: 1,
    editorSlug: "title",
  },
  field: {
    why: "It decides which searches you appear in",
    action: "Pick Your Role",
    href: "/join/provider?step=finish",
    minutes: 1,
    editorSlug: "role",
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
    action: "Set Your Rates",
    href: "/join/provider?step=finish",
    minutes: 1,
    editorSlug: "rates",
  },
  photo: {
    why: "A face is the difference between a record and a person",
    action: "Add a Photo",
    href: "/join/provider?step=finish",
    minutes: 1,
    editorSlug: "photo",
  },
  identity: {
    why: "Your address and phone — how work reaches you",
    action: "Add Your Contact Details",
    href: "/settings/contact",
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
    href: "/settings/contact",
    minutes: 1,
  },
  languages: {
    why: "It decides which buyers can work with you",
    action: "Add a Language",
    href: "/join/provider?step=education&return=review",
    minutes: 1,
    editorSlug: "languages",
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
    editorSlug: "work-method",
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

export const DECLARED_NONE_RIDER = "you told us you have none";
