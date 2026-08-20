import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { formatCents, displayFullName } from "@/lib/display";
import { RichText } from "@/components/profile/RichText";
import { WorkHistoryEntry } from "@/components/profile/WorkHistoryEntry";
import { CappedList } from "@/components/profile/CappedList";
import type { MentorState } from "@/lib/community-signal";

/**
 * The Profile-View section vocabulary (brief_X / E056).
 *
 * ONE set of section renderers, shared by the two surfaces that must look the
 * same:
 *
 *   1. the PUBLISHED profile — `components/profile/ProviderProfileView.tsx`
 *   2. the PRE-PUBLISH review — step 13 of `/join/provider`
 *
 * E056 was "the review page doesn't match the design"; the design *is* the
 * published profile. Forking a second review layout is how the two drift apart
 * again, so the markup lives here and each surface supplies only what actually
 * differs: the published page passes `<Link>` edit affordances and reads the
 * server view-model, the review page passes `<button>` affordances and reads
 * the wizard's local draft.
 *
 * Deliberately free of client-only code (no hooks, no handlers of its own) so
 * the server component and the "use client" wizard can both import it. Every
 * prop type is STRUCTURAL and minimal — the wizard draft and the prisma-loaded
 * view-model satisfy them without either side converting to the other's shape.
 */

export const LEVEL_LABELS: Record<string, string> = {
  BASIC: "Basic",
  CONVERSATIONAL: "Conversational",
  FLUENT: "Fluent",
  NATIVE_OR_BILINGUAL: "Native or Bilingual",
};

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

/**
 * One profile section card. `edit` is a SLOT, not a href or a handler: the
 * published page needs a `<Link>` (navigation) and the review page needs a
 * `<button>` (in-page state), and pushing both through one prop is what makes a
 * shared component grow a `isReview` flag.
 */
/**
 * The card shell used by every profile section. The mockup draws a noticeably
 * darker stroke than the app's usual hairline `border-line`, so this sits
 * between the two — dark enough to read as the mockup, not so dark it fights
 * the rest of the product.
 */
export const CARD =
  "rounded-[18px] border border-ink/25 bg-white p-5 sm:p-6";

export function ProfileCard({
  title,
  edit,
  id,
  children,
}: {
  title: string;
  edit?: ReactNode;
  /** Anchor target, so a click-to-fix link can scroll to this section. */
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${CARD}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[18px]">{title}</h2>
        {edit}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[14px] text-ink-2">{children}</p>;
}

/** The pencil affordance, so both surfaces render an identical control. */
const EDIT_CLASS =
  "text-[14px] font-bold text-magenta transition-colors hover:text-magenta-dark";

export function EditButton({
  title,
  onClick,
  label = "Edit",
  /** "✏️" to edit, "+" to add — E130's one rule, two states. */
  icon = "✏️",
}: {
  title: string;
  onClick: () => void;
  label?: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${title}`}
      className={EDIT_CLASS}
    >
      {icon} {label}
    </button>
  );
}

export { EDIT_CLASS };

/** "2019 – Present" from ISO dates. Empty when the role carries no dates. */
export function dateRange(
  start: string | null,
  end: string | null,
  isCurrent = false
): string {
  if (!start && !end) return "";
  const y = (d: string | null) => (d ? d.slice(0, 4) : null);
  return `${y(start) ?? "?"} – ${isCurrent ? "Present" : end ? y(end) : "Present"}`;
}

// ---------------------------------------------------------------------------
// Item shapes — structural, so both the draft and the view-model fit
// ---------------------------------------------------------------------------

export type SkillItem = { id: string; name: string };
export type SpecializationItem = { id: string; name: string };
export type LanguageItem = {
  id?: string;
  name: string;
  level?: string | null;
  proficiency?: string | null;
};
export type EducationItem = {
  id?: string;
  institution: string;
  degree?: string | null;
  field?: string | null;
  startYear?: number | null;
  endYear?: number | null;
};
export type ArtifactItem = {
  id: string;
  kind: "UPLOAD" | "URL";
  label: string;
  url: string | null;
  fileName: string | null;
};

export type EmployerItem = {
  id: string;
  name: string;
  roleTitle?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  projects?: { id: string; name: string; description?: string | null }[];
  artifacts?: ArtifactItem[];
  /** WS5 — present only when the viewer may see it; see lib/plus.ts. */
  contactEmail?: string | null;
  hasContact?: boolean;
  locked?: boolean;
};
export type ProjectItem = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  employer?: string | null;
  // --- brief_project_model_v2 ---------------------------------------------
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  clientName?: string | null;
  clientVisibility?: string | null;
  codeName?: string | null;
  validationStatus?: string | null;
  /** ISO timestamp of the CONFIRMED response — drives "Confirmed March 2026". */
  validatedAt?: string | null;
  logoUrl?: string | null;
  highlights?: string[];
  roleType?: { id: string; name: string } | null;
  industry?: { id: string; name: string } | null;
  applications?: { id: string; name: string }[];
  outcomes?: { id?: string; label: string; value: string }[];
  artifacts?: ArtifactItem[];
  /** WS5 — present only when the viewer may see it; see lib/plus.ts. */
  contactEmail?: string | null;
  hasContact?: boolean;
  locked?: boolean;
};

/**
 * Who the work was for, as the card is allowed to say it
 * (brief_project_model_v2).
 *
 * ONE place decides this. `CONFIDENTIAL` replaces the client with the code name
 * and the industry — "Project Falcon · Confidential — Energy" — and the real
 * name never reaches the markup, so it cannot leak through a stray render.
 * `PLUS_ONLY` deliberately behaves as PUBLIC until membership ships; when it
 * does, this function is the only thing that changes.
 */
export function clientLabel(p: ProjectItem): {
  title: string;
  redacted: boolean;
} {
  const industry = p.industry?.name;
  if (p.clientVisibility === "CONFIDENTIAL") {
    return {
      title: [p.codeName || "Confidential project", industry ? `Confidential — ${industry}` : "Confidential"]
        .filter(Boolean)
        .join(" · "),
      redacted: true,
    };
  }
  return {
    title: p.clientName || p.employer || "",
    redacted: false,
  };
}
export type CertificationItem = {
  id?: string;
  name: string;
  issuer?: string | null;
  year?: number | null;
  issuedOn?: string | null;
  expiresOn?: string | null;
  url?: string | null;
  notes?: string | null;
  attachmentName?: string | null;
};

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * The full-width HERO — PJv2 WS3, matching "Profile Review Mock up" pg1.
 *
 * Three columns: photo · (name → tagline → bio) · meta rail.
 *
 * The BIO lives INSIDE the hero, which is the mockup's real insight: the first
 * card answers "who is this, what do they charge, can I read them" in one
 * glance, instead of making a buyer scroll to a separate Overview card. The meta
 * rail is right-aligned inside the hero rather than being a page-level column,
 * so there is no left/right rail below and the sections underneath run
 * full-width.
 */
export function ProfileHero({
  firstName,
  lastName,
  photoUrl,
  headline,
  overview,
  validated = false,
  mentor = null,
  rateMinCents,
  rateMaxCents,
  currency = "USD",
  youGetCents,
  language,
  country,
  experience,
  aside,
  headingAs: HeadingTag = "h1",
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  headline?: string | null;
  overview?: string | null;
  validated?: boolean;
  /**
   * ⚠ THE MENTOR BADGE, SHIPPED DARK ON PURPOSE (brief_community_signal WS3).
   *
   * `null` renders NO ROW — that is the onboarding review, which knows nothing
   * about forums. A state object renders the badge with its condition in words,
   * and `earned` cannot be true until a threshold exists: see
   * MENTOR_HELPFUL_THRESHOLD, which is `null` because there is no distribution to
   * choose one against yet.
   */
  mentor?: MentorState | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  currency?: string;
  youGetCents?: number | null;
  language?: string | null;
  country?: string | null;
  /** WS6 — DERIVED from work-history spans, never self-reported. */
  experience?: string | null;
  aside?: ReactNode;
  headingAs?: "h1" | "h2";
}) {
  const Heading = HeadingTag;

  /** "$90 – $120" from the range; a single figure when min === max. */
  const rateLabel = (() => {
    if (rateMinCents == null && rateMaxCents == null) return null;
    const lo = rateMinCents ?? rateMaxCents!;
    const hi = rateMaxCents ?? rateMinCents!;
    return lo === hi
      ? formatCents(lo, currency)
      : `${formatCents(lo, currency)} – ${formatCents(hi, currency)}`;
  })();

  return (
    <header className={CARD}>
      <div className="flex flex-col gap-6 sm:flex-row">
        <Avatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size={120}
        />

        <div className="min-w-0 flex-1">
          <Heading className="text-[30px] leading-[1.1] tracking-[-0.6px] sm:text-[38px]">
            {displayFullName(firstName, lastName)}
          </Heading>
          <p className="mt-2 text-[19px] leading-snug text-ink">
            {headline || "Add a professional title"}
          </p>
          {overview ? (
            <div className="mt-3">
              <RichText
                text={overview}
                clampLines={6}
                className="text-[15px] leading-relaxed text-ink-2"
              />
            </div>
          ) : (
            <p className="mt-3 text-[14px] text-ink-2">No overview yet.</p>
          )}
          {aside}
        </div>

        {/* Meta rail — right side of the hero (mockup pg1). */}
        <dl className="w-full flex-none space-y-2 text-[14.5px] sm:w-[190px]">
          <div>
            <dd
              className={
                validated
                  ? "font-bold text-emerald-600"
                  : "text-ink-2/60"
              }
            >
              {validated ? "✓ Validated" : "Validated"}
            </dd>
          </div>
          {/*
            MENTOR — same treatment as Validated: dim until earned. It cannot be
            earned yet by construction (no threshold), so the sub-line carries
            what it is FOR, which is the point of shipping it dark rather than
            hiding it: Scott can see the mechanic and the live number before
            choosing a bar.
          */}
          {mentor && (
            <div>
              <dd className={mentor.earned ? "font-bold text-emerald-600" : "text-ink-2/60"}>
                {mentor.earned ? "✓ Mentor" : "Mentor"}
              </dd>
              <p className="text-[12.5px] text-ink-2/60">{mentor.detail}</p>
            </div>
          )}
          {rateLabel && (
            <div>
              <dt className="inline font-bold">Hourly Rate: </dt>
              <dd className="inline">{rateLabel}</dd>
              {youGetCents != null && (
                <p className="text-[12.5px] text-ink-2">
                  You&apos;ll Get {formatCents(youGetCents, currency)}/hr
                </p>
              )}
            </div>
          )}
          {experience && (
            <div>
              <dt className="inline font-bold">Experience: </dt>
              <dd className="inline">{experience}</dd>
            </div>
          )}
          {language && (
            <div>
              <dt className="inline font-bold">Language: </dt>
              <dd className="inline">{language}</dd>
            </div>
          )}
          {country && (
            <div>
              <dt className="inline font-bold">Country: </dt>
              <dd className="inline">{country}</dd>
            </div>
          )}
        </dl>
      </div>
    </header>
  );
}

/**
 * The pre-v2 header card. `ProfileHero` above replaced it on both v2 surfaces in
 * WS3, so nothing renders this today — it stays only until `/providers/[id]` is
 * converged, which is its own pass rather than something smuggled into a brief.
 *
 * The self-reported experience LEVEL it used to print is gone (WS6/WS7 dropped
 * the column); years of experience are derived from the work history now, so
 * there is nothing here to replace it with.
 */
export function ProfileHeaderCard({
  firstName,
  lastName,
  photoUrl,
  headline,
  location,
  field,
  validated = false,
  hourlyCents,
  currency = "USD",
  youGetCents,
  aside,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  field?: { role: string; domain: string } | null;
  validated?: boolean;
  hourlyCents?: number | null;
  currency?: string;
  /** Shown to the OWNER only — the take-home after the service fee. */
  youGetCents?: number | null;
  aside?: ReactNode;
}) {
  const meta = [location, field ? `${field.role} · ${field.domain}` : null].filter(
    Boolean
  );

  return (
    <header className="rounded-brand border border-line bg-white p-6">
      <div className="flex flex-wrap items-start gap-5">
        <Avatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={photoUrl}
          size={96}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] tracking-[-0.5px]">
              {displayFullName(firstName, lastName)}
            </h1>
            {validated && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-extrabold text-emerald-700">
                ✓ Validated
              </span>
            )}
          </div>
          <p className="mt-1 text-[17px] text-ink-2">
            {headline || "No title yet"}
          </p>
          {meta.length > 0 && (
            <p className="mt-1.5 text-[14px] text-ink-2">{meta.join(" · ")}</p>
          )}
          {aside}
        </div>
        <div className="text-right">
          <p className="text-[26px] font-extrabold">
            {hourlyCents != null ? formatCents(hourlyCents, currency) : "—"}
            <span className="text-[15px] font-semibold text-ink-2">/hr</span>
          </p>
          {youGetCents != null && (
            <p className="text-[13px] text-ink-2">
              You&apos;ll Get {formatCents(youGetCents, currency)}/hr
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Section bodies
// ---------------------------------------------------------------------------

export function VerificationsBody({
  emailVerified,
  phoneOnFile,
  phoneVerified,
}: {
  emailVerified: boolean;
  phoneOnFile: boolean;
  phoneVerified: boolean;
}) {
  return (
    <ul className="space-y-1.5 text-[14px]">
      <li
        className={
          emailVerified ? "font-semibold text-emerald-600" : "text-ink-2"
        }
      >
        {emailVerified ? "✓ Email Verified" : "Email not verified"}
      </li>
      <li className="text-ink-2">
        {/* E036 — SMS verification is stubbed, so a number on file shows as
            "on file". The badge must never claim more than we checked. */}
        {phoneVerified
          ? "✓ Phone Verified"
          : phoneOnFile
            ? "Phone on file"
            : "No phone on file"}
      </li>
    </ul>
  );
}

export function LanguagesBody({ languages }: { languages: LanguageItem[] }) {
  if (languages.length === 0) return <Empty>No languages listed.</Empty>;
  return (
    <ul className="space-y-1 text-[14px]">
      {languages.map((l, i) => (
        <li key={l.id ?? `${l.name}-${i}`}>
          <b>{l.name}</b>
          {(l.level || l.proficiency) && (
            <span className="text-ink-2">
              {" — "}
              {l.level ? LEVEL_LABELS[l.level] ?? l.level : l.proficiency}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function EducationBody({ education }: { education: EducationItem[] }) {
  if (education.length === 0) return <Empty>No education listed.</Empty>;
  return (
    <ul className="space-y-2.5 text-[14px]">
      {education.map((e, i) => (
        <li key={e.id ?? `${e.institution}-${i}`}>
          <p className="font-semibold">{e.institution}</p>
          <p className="text-ink-2">
            {[e.degree, e.field].filter(Boolean).join(", ")}
          </p>
          {(e.startYear || e.endYear) && (
            <p className="text-[13px] text-ink-2">
              {[e.startYear, e.endYear].filter(Boolean).join(" – ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SpecializationsBody({
  specializations,
}: {
  specializations: SpecializationItem[];
}) {
  if (specializations.length === 0) return <Empty>None listed.</Empty>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {specializations.map((s) => (
        <span
          key={s.id}
          className="rounded-full border border-magenta/30 bg-magenta/[0.06] px-2.5 py-0.5 text-[12.5px] font-semibold text-magenta-dark"
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}

export function OverviewBody({
  overview,
  empty = "No overview yet.",
}: {
  overview?: string | null;
  empty?: string;
}) {
  if (!overview) return <Empty>{empty}</Empty>;
  // The bio is the longest thing on a profile and the most likely to be
  // multi-paragraph, so it is the one that most needs both fixes.
  return (
    <RichText
      text={overview}
      clampLines={8}
      className="text-[15px] leading-relaxed text-ink-2"
    />
  );
}

export function SkillsBody({
  skills,
  field,
}: {
  skills: SkillItem[];
  field?: { role: string; domain: string } | null;
}) {
  return (
    <>
      {field && (
        <p className="mb-3 text-[13px] text-ink-2">
          {field.role} · {field.domain}
        </p>
      )}
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-line px-3 py-1 text-[13.5px] font-semibold text-ink-2"
            >
              {s.name}
            </span>
          ))}
        </div>
      ) : (
        <Empty>No skills listed.</Empty>
      )}
    </>
  );
}

/**
 * Skills + Specializations in ONE band (brief_profile_layout_v2 §3.2).
 *
 * Together and high on the page because these are the two axes buyers actually
 * search on — Role→Domain→Skill (what they can do) and Specializations (which
 * systems/sectors they know). Split across a column and a rail they read as
 * trivia; side by side under the bio they read as the answer to "can this person
 * do my job".
 */
export function SkillsSpecializationsBand({
  skills,
  specializations,
  field,
}: {
  skills: SkillItem[];
  specializations: SpecializationItem[];
  field?: { role: string; domain: string } | null;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-2">
          Skills
        </p>
        <SkillsBody skills={skills} field={field} />
      </div>
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-2">
          Specializations
        </p>
        <SpecializationsBody specializations={specializations} />
      </div>
    </div>
  );
}

export function ProjectsBody({
  projects,
  empty,
  isOwner = false,
}: {
  projects: ProjectItem[];
  empty: string;
  /** Owner-only states (a pending validation) render only when true. */
  isOwner?: boolean;
}) {
  if (projects.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((pr) => (
        <ProjectCard key={pr.id} p={pr} isOwner={isOwner} />
      ))}
    </div>
  );
}

/**
 * The project card (brief_project_model_v2).
 *
 * Reads top-down the way a buyer scans: WHO it was for, WHAT the numbers were,
 * then the detail. The outcome pills sit high on purpose — a quantified result
 * is the single most persuasive thing on a provider's profile, and burying it
 * under a paragraph wastes it.
 */
export function ProjectCard({
  p,
  isOwner = false,
}: {
  p: ProjectItem;
  isOwner?: boolean;
}) {
  const { title, redacted } = clientLabel(p);
  const tools = p.applications ?? [];
  const outcomes = p.outcomes ?? [];
  const range = dateRange(
    p.startDate ?? null,
    p.endDate ?? null,
    p.isCurrent ?? false
  );

  return (
    <article
      // Anchor target for the Work-History cross-links (brief §4).
      // `scroll-mt-24` keeps the card clear of the top of the viewport after a
      // jump, instead of flush against it.
      id={`project-${p.id}`}
      className="flex scroll-mt-24 flex-col rounded-brand border border-line p-4 transition-shadow hover:shadow-brand"
    >
      <div className="flex items-start gap-3">
        {p.logoUrl && !redacted ? (
          // A confidential project never shows the client's logo — it would
          // identify exactly what the code name is there to hide.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.logoUrl}
            alt=""
            className="h-10 w-10 flex-none rounded-[8px] border border-line bg-white object-contain p-1"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-magenta/10 text-[17px]"
          >
            {redacted ? "🔒" : "📁"}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] leading-snug">{p.name}</h3>
            {/* The trust signal (brief_project_validation §5). VALIDATED is
                public — that is the whole point. PENDING is OWNER-ONLY: a buyer
                seeing "awaiting reply" would learn that a provider asked and
                hasn't been answered, which is worse than silence and is not
                theirs to know. Anything else simply shows no badge. */}
            {p.validationStatus === "VALIDATED" ? (
              <span className="flex-none rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                ✓ Validated
              </span>
            ) : isOwner && p.validationStatus === "PENDING" ? (
              <span className="flex-none rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-700">
                Validation requested
              </span>
            ) : null}
          </div>
          {title && (
            // Wraps rather than truncates: the confidential form of this line
            // ("Project Falcon · Confidential — Energy Services") is the whole
            // substitute for the client name, and clipping it to "Confidential
            // — E…" throws away the industry it exists to show.
            <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-2">{title}</p>
          )}
          {range && <p className="text-[12.5px] text-ink-2">{range}</p>}
          {p.validationStatus === "VALIDATED" && p.validatedAt && (
            <p className="text-[12px] text-emerald-700">
              Confirmed{" "}
              {new Date(p.validatedAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {outcomes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {outcomes.map((o, i) => (
            <span
              key={o.id ?? `${o.label}-${i}`}
              className="rounded-[8px] border border-magenta/20 bg-magenta/[0.06] px-2 py-1 text-[12px] leading-tight"
            >
              <b className="block text-[13px] font-extrabold text-magenta-dark">
                {o.value}
              </b>
              <span className="text-ink-2">{o.label}</span>
            </span>
          ))}
        </div>
      )}

      {(p.roleType || tools.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.roleType && (
            <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[12px] font-bold text-ink">
              {p.roleType.name}
            </span>
          )}
          {tools.slice(0, 4).map((t) => (
            <span
              key={t.id}
              className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold text-ink-2"
            >
              {t.name}
            </span>
          ))}
          {tools.length > 4 && (
            <span className="self-center text-[12px] text-ink-2">
              +{tools.length - 4}
            </span>
          )}
        </div>
      )}

      {p.description && (
        <div className="mt-3">
          <RichText
            text={p.description}
            clampLines={3}
            className="text-[14px] leading-relaxed text-ink-2"
          />
        </div>
      )}

      {(p.highlights?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-1">
          {p.highlights!.slice(0, 3).map((h, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] text-ink-2">
              <span className="text-magenta">•</span>
              <span className="line-clamp-2 whitespace-pre-line">{h}</span>
            </li>
          ))}
        </ul>
      )}

      {(p.hasContact || p.contactEmail) && (
        <div className="mt-3">
          <ContactBody
            contactEmail={p.contactEmail}
            locked={p.locked}
          />
        </div>
      )}

      {(p.artifacts?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-ink-2">
            Artifacts
          </p>
          <ArtifactsBody artifacts={p.artifacts!} />
        </div>
      )}

      {p.url && (
        <a
          href={p.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[13px] font-bold text-magenta hover:text-magenta-dark"
        >
          View project →
        </a>
      )}
    </article>
  );
}

/**
 * Work History — PJv2 WS3, mockup pg1.
 *
 * Employer is the ONE work-history model (E042). Each entry is a client
 * component because its four links are disclosures; the list itself stays here
 * so both profile surfaces share it.
 */
export function WorkHistoryBody({
  employers,
  empty,
  projects = [],
  isOwner = false,
  artifactsFor,
  contactFor,
  condensed = false,
  cap,
}: {
  employers: EmployerItem[];
  empty: string;
  /** All projects; each entry is given the ones belonging to it. */
  projects?: ProjectItem[];
  isOwner?: boolean;
  /** WS4 / WS5 slots, resolved per employer by the caller. */
  artifactsFor?: (employerId: string) => React.ReactNode;
  contactFor?: (employerId: string) => React.ReactNode;
  /** One tight line per role — the "You're live" page (WS1/E146). */
  condensed?: boolean;
  /**
   * Show at most this many entries, the rest behind a "N more — pending"
   * disclosure (walk7 WS5). Used only by the "You're live" page.
   *
   * home_v2 condensed each entry to one line so that page would read as "here's
   * your live profile" rather than a scroll. Measured, that wasn't enough: a
   * 13-employer history is still 1144px of it. Condensing shrank each row; this
   * caps how many rows there are. Five covers the recent history most people
   * have; the rest are the older jobs a buyer skims past, and nothing is hidden —
   * the group says how many are behind it and opens in place.
   */
  cap?: number;
}) {
  if (employers.length === 0) return <Empty>{empty}</Empty>;
  /*
    E089 — NO divider between entries. The full-width rules were the main reason
    the section read as "an empty table row, not fun to look at" (Scott): a rule
    spanning the card turns each job into a row in a grid, and the four action
    links stranded across the same width completed the effect. Entries are
    separated by SPACE now. The fix here is taking lines away, not adding
    containment — bordered cards per job would trade one heavy treatment for
    another.
  */
  return (
    <CappedList
      cap={cap}
      items={employers.map((e, i) => {
        // Prefer the employer's own nested list; fall back to matching the flat
        // project list by employer name, which is the only key the wizard's
        // draft carries.
        const nested = e.projects ?? [];
        const mine = nested.length
          ? projects.filter((p) => nested.some((n) => n.id === p.id))
          : projects.filter((p) => p.employer === e.name);
        return (
          <li key={e.id}>
            <WorkHistoryEntry
              employer={e}
              projects={mine}
              isOwner={isOwner}
              artifactsSlot={artifactsFor?.(e.id)}
              contactSlot={contactFor?.(e.id)}
              condensed={condensed}
            />
          </li>
        );
      })}
    />
  );
}

/**
 * Solo Projects — PJv2 WS3 / E074, mockup pg2.
 *
 * Full-width, and ONLY projects with no `employer_id`. Work delivered inside a
 * job lives under its employer in Work History; this section is the work done
 * between or outside companies. The note says so out loud, because two homes for
 * "projects" is exactly the ambiguity E074 reported.
 */
export function SoloProjectsBody({
  projects,
  empty,
  isOwner = false,
}: {
  projects: ProjectItem[];
  empty: string;
  isOwner?: boolean;
}) {
  return (
    <>
      <p className="mb-4 text-[13px] text-ink-2">
        Employee projects are under their Employer in Work History.
      </p>
      {projects.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} isOwner={isOwner} />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Artifacts, read-only (PJv2 WS4 / E078a).
 *
 * UPLOADs show as a file chip and are NOT linked: the bucket is private, so a
 * public href would either 404 or leak. Reading one back needs a signed URL,
 * which is a separate (viewer-permissioned) step — showing the name is the
 * honest amount of information a public profile can give.
 */
export function ArtifactsBody({ artifacts }: { artifacts: ArtifactItem[] }) {
  if (artifacts.length === 0) return <Empty>No artifacts attached.</Empty>;
  return (
    <ul className="flex flex-wrap gap-2">
      {artifacts.map((a) =>
        a.kind === "URL" && a.url ? (
          <li key={a.id}>
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-magenta/30 bg-magenta/[0.05] px-3 py-1 text-[13px] font-semibold text-magenta-dark transition-colors hover:border-magenta"
            >
              🔗 {a.label}
            </a>
          </li>
        ) : (
          <li
            key={a.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-ink-2"
            title={a.fileName ?? undefined}
          >
            📎 {a.label}
          </li>
        )
      )}
    </ul>
  );
}

/**
 * The Validation Contact — Plus's first lever (PJv2 WS5 / E078b).
 *
 * Free tier sees that a contact EXISTS and is invited to upgrade; Plus sees the
 * address. The distinction is enforced server-side (lib/plus.ts) — by the time
 * this renders, a locked contact simply has no address to leak, so this component
 * cannot accidentally show one.
 */
export function ContactBody({
  contactEmail,
  locked,
  label = "Validation Contact",
}: {
  contactEmail?: string | null;
  locked?: boolean;
  label?: string;
}) {
  if (locked) {
    return (
      <div className="rounded-[12px] border border-magenta/30 bg-magenta/[0.05] p-3">
        <p className="text-[13.5px] font-bold text-magenta-dark">
          🔒 Upgrade to Plus to reveal the validation contact
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Plus members see the named person who can vouch for this work — a warm
          reference, not a cold outreach.
        </p>
      </div>
    );
  }
  if (!contactEmail) return null;
  return (
    <div className="rounded-[12px] border border-line bg-bg-soft/60 p-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
        {label}
      </p>
      <a
        href={`mailto:${contactEmail}`}
        className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
      >
        {contactEmail}
      </a>
    </div>
  );
}

/** Location card (mockup pg2 grid). */
export function LocationBody({
  location,
  country,
}: {
  location?: string | null;
  country?: string | null;
}) {
  const text = location || country;
  if (!text) return <Empty>No location listed.</Empty>;
  return (
    <div className="text-[14.5px]">
      <p>{location || country}</p>
      {location && country && !location.includes(country) && (
        <p className="text-ink-2">{country}</p>
      )}
    </div>
  );
}

export function CertificationsBody({
  certifications,
  empty,
}: {
  certifications: CertificationItem[];
  empty: string;
}) {
  if (certifications.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="space-y-2">
      {certifications.map((c, i) => {
        const meta = [
          c.issuer,
          c.issuedOn ? c.issuedOn.slice(0, 4) : c.year,
          c.expiresOn ? `expires ${c.expiresOn.slice(0, 4)}` : null,
        ].filter(Boolean);
        return (
          <li key={c.id ?? `${c.name}-${i}`} className="text-[14px]">
            <b>{c.name}</b>
            {meta.length > 0 && (
              <span className="text-ink-2">{` — ${meta.join(" · ")}`}</span>
            )}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-[13px] font-bold text-magenta hover:text-magenta-dark"
              >
                Verify
              </a>
            )}
            {c.attachmentName && (
              <span className="ml-2 text-[13px] text-ink-2">
                📎 {c.attachmentName}
              </span>
            )}
            {c.notes && (
              <p className="whitespace-pre-line text-[13px] text-ink-2">
                {c.notes}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
