import Link from "next/link";
import { roleLong } from "@/lib/role-labels";
import { countryName } from "@/lib/country";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { formatCents, displayFullName } from "@/lib/display";
import { RichText } from "@/components/profile/RichText";
import { WorkHistoryEntry } from "@/components/profile/WorkHistoryEntry";
import { ValidatedBadge, ValidationPending } from "@/components/profile/ValidatedBadge";
import { CappedList } from "@/components/profile/CappedList";
import type { MentorState } from "@/lib/community-signal";
import { dateRangeLabel } from "@/lib/date-range-label";
import { projectMonogram } from "@/lib/project-monogram";
import { CredentialProvenance } from "@/components/profile/CredentialProvenance";
import { CLEAN_CHIP, CleanSection } from "@/components/profile/CleanSection";
import { PROFICIENCY_LABEL } from "@/lib/languages";

const CHIP_BASE =
  "inline-flex max-w-full items-center px-3 py-1 text-[13px] font-semibold break-words";
export const CHIP_TAG = `${CHIP_BASE} border border-magenta/30 bg-magenta/[0.06] text-magenta-dark`;
/** A SKILL — a tag chip, magenta since ruling 31e. */
const CHIP_SKILL = CHIP_TAG;
/** A SPECIALIZATION — the same tag chip. 31e: *"Skills matches Specializations."* */
const CHIP_SPEC = CHIP_TAG;

/** The Profile-View section vocabulary (brief_X / E056). */

// THE THIRD LABEL TABLE, RETIRED ( item 10, ). Re-exported rather than
export const LEVEL_LABELS: Record<string, string> = PROFICIENCY_LABEL;

// ---------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------

/** One profile section card. `edit` is a SLOT, not a href or a handler: the */
/** The card shell used by every profile section. The mockup draws a noticeably */
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
  // R-E006: the Register review uses My Profile's thin-line section.
  return (
    <CleanSection title={title} id={id} action={edit} showWhenEmpty>
      {children}
    </CleanSection>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[14px] text-ink-2">{children}</p>;
}

/** The pencil affordance, so both surfaces render an identical control. */
const EDIT_CLASS = "text-[12px] font-semibold text-magenta-dark hover:underline";

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
      {icon === "+" && !label.startsWith("+") ? "+ " : ""}
      {label}
    </button>
  );
}

/** THE SAME AFFORDANCE AS A LINK WS-B item 6) */
export function EditLink({
  href,
  title,
  label = "Edit",
  /** "✏️" to edit, "+" to add — `E130`'s one rule, two states. */
  icon = "✏️",
}: {
  href: string;
  title: string;
  label?: string;
  icon?: string;
}) {
  return (
    <Link href={href} aria-label={`${label} ${title}`} className={EDIT_CLASS}>
      {icon} {label}
    </Link>
  );
}

export { EDIT_CLASS };

/** — THE WORST INSTANCE, NOT THE SMALLEST. */
export function dateRange(
  start: string | null,
  end: string | null,
  isCurrent = false
): string {
  return dateRangeLabel(start, end, isCurrent);
}

// ---------------------------------------------------------------------------
// Item shapes — structural, so both the draft and the view-model fit
// ---------------------------------------------------------------------------

export type SkillItem = { id: string; name: string };
/** It was ALREADY selected and mapped by `provider-profile-view.ts`; only */
export type SpecializationItem = { id: string; name: string; kind?: string | null };
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
  /* NULLABLE (`P1-J1.4-E373`) — render via `employerDisplayName()`. */
  name: string | null;
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
  // THE VALIDATION BADGE , WS-C)
  validated?: boolean;
  validationPending?: boolean;
  validatedAt?: string | null;
  validatedBy?: string | null;
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

/** Who the work was for, as the card is allowed to say it */
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
  // PROVENANCE . Optional because three callers fill this type and
  issuedFrom?: string | null;
  credentialId?: string | null;
  /** Credential kind (2026-10-08); missing = CERTIFICATION. */
  kind?: string | null;
  publicUrl?: string | null;
};

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/** The full-width HERO — PJv2 WS3, matching "Profile Review Mock up" pg1. */
export function ProfileHero({
  firstName,
  lastName,
  photoUrl,
  headline,
  overview,
  overviewShownElsewhere = false,
  validated = false,
  mentor = null,
  onsiteCents,
  remoteCents,
  currency = "USD",
  youGetCents,
  language,
  country,
  experience,
  skills = [],
  skillsCap = 8,
  aside,
  headingAs: HeadingTag = "h1",
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  headline?: string | null;
  overview?: string | null;
  /** SCOTT: *"Why is there still two overviews… image 1 and image two are */
  overviewShownElsewhere?: boolean;
  validated?: boolean;
  /** THE MENTOR BADGE, SHIPPED DARK ON PURPOSE (brief_community_signal WS3). */
  mentor?: MentorState | null;
  /* `E823` — the two rates the whole app shows now. `rateMin/Max` stay in the
     TYPE so no caller breaks, and are deliberately not destructured: nothing
     renders a range any more. */
  onsiteCents?: number | null;
  remoteCents?: number | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  currency?: string;
  youGetCents?: number | null;
  language?: string | null;
  country?: string | null;
  /** WS6 — DERIVED from work-history spans, never self-reported. */
  experience?: string | null;
  /** SKILLS IN THE HERO WS-C item 8) */
  skills?: SkillItem[];
  /** CAPPED AT EIGHT. A provider with thirty chips pushes everything below */
  skillsCap?: number;
  aside?: ReactNode;
  headingAs?: "h1" | "h2";
}) {
  const Heading = HeadingTag;

  // TWO RATES, NOT A RANGE , . Scott, 2026-10-03: the whole
  const rateRows = (
    [
      ["Onsite rate", onsiteCents],
      ["Offsite rate", remoteCents],
    ] as const
  ).filter(([, cents]) => cents != null) as [string, number][];

  /* Capped for the hero; the count of what is NOT shown drives "+N more". */
  const shownSkills = skills.slice(0, skillsCap);
  const moreSkills = Math.max(0, skills.length - shownSkills.length);

  return (
    <header className="lg:sticky lg:top-24 lg:self-start">
      {/* TWO COLUMNS WS-C item 7) */}
      <div className="flex flex-col gap-6">
        {/* ── LEFT — IDENTITY ────────────────────────────────────────────── */}
        <div className="w-full">
          <div className="flex items-start gap-4">
            <Avatar
              firstName={firstName}
              lastName={lastName}
              photoUrl={photoUrl}
              size={96}
            />
            <div className="min-w-0 flex-1">
              <Heading className="text-[24px] leading-[1.15] tracking-[-0.5px]">
                {displayFullName(firstName, lastName)}
              </Heading>
              <p className="mt-1 text-[15.5px] leading-snug text-ink-2">
                {headline || "Add a professional title"}
              </p>
              {/* RESOLVED ( WS-C ruling 4). This is fed from the WIZARD DRAFT, whose */}
              {country && (
                <p className="mt-1 text-[13.5px] text-ink-2">
                  {countryName(country, country)}
                </p>
              )}
            </div>
          </div>

          {/* DIM UNTIL EARNED — unchanged from the meta rail, byte for byte. */}
          <dl className="mt-4 space-y-2 text-[14.5px]">
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
            {/* MENTOR — same treatment as Validated: dim until earned. It cannot */}
            {mentor && (
              <div>
                <dd className={mentor.earned ? "font-bold text-emerald-600" : "text-ink-2/60"}>
                  {mentor.earned ? "✓ Mentor" : "Mentor"}
                </dd>
                <p className="text-[12.5px] text-ink-2/60">{mentor.detail}</p>
              </div>
            )}

            {/* THE RATE ROWS, BENEATH THE IDENTITY (item 7) */}
            {rateRows.length > 0 && (
              <div>
                {rateRows.map(([label, cents]) => (
                  <span key={label} className="block">
                    <dt className="inline font-bold">{label}: </dt>
                    <dd className="inline">{formatCents(cents, currency)}/hr</dd>
                  </span>
                ))}
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
          </dl>

          {aside}
        </div>

        {/* RIGHT — OVERVIEW, THEN SKILLS */}
        <div className="min-w-0 flex-1 empty:hidden">
          {/* THREE STATES, NOT TWO ( WS-2): text · genuinely empty · */}
          {overviewShownElsewhere ? null : overview ? (
            <RichText
              text={overview}
              clampLines={6}
              className="text-[15px] leading-relaxed text-ink-2"
            />
          ) : (
            <p className="text-[14px] text-ink-2">No overview yet.</p>
          )}

          {/* SKILLS, UNDER OVERVIEW (item 8) */}
          {shownSkills.length > 0 && (
            <div className={overviewShownElsewhere ? "" : "mt-4"}>
              <div className="flex flex-wrap gap-2">
                {shownSkills.map((sk) => (
                  <span
                    key={sk.id}
                    className={CLEAN_CHIP}
                  >
                    {sk.name}
                  </span>
                ))}
                {moreSkills > 0 && (
                  <span className="self-center text-[13px] font-semibold text-ink-2">
                    +{moreSkills} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** The pre-v2 header card. `ProfileHero` above replaced it on both v2 surfaces in */
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
        <li data-row key={l.id ?? `${l.name}-${i}`}>
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

/** Same rule as `CertificationsBody` above — an empty section offers a door */
export function EducationBody({
  education,
  emptyAction,
}: {
  education: EducationItem[];
  emptyAction?: ReactNode;
}) {
  if (education.length === 0)
    return (
      <>
        <Empty>No education listed.</Empty>
        {emptyAction}
      </>
    );
  // THE FACTS ARE LABELLED (brief 10 WS-B)
  // THE LOCAL `Row` IS GONE — it was byte-identical to `CertRow`, and both are now

  return (
    <ul className="space-y-3 text-[14px]">
      {education.map((e, i) => {
        const years = [e.startYear, e.endYear].filter(Boolean).join(" – ");
        return (
          <li data-row key={e.id ?? `${e.institution}-${i}`}>
            {/* AN EMPTY INSTITUTION RENDERS NOTHING, NOT AN EMPTY BOLD LINE. */}
            {e.institution.trim() && (
              <p className="font-semibold">{e.institution}</p>
            )}
            {e.degree && <LabelValue label="Degree" value={e.degree} />}
            {e.field && <LabelValue label="Major" value={e.field} />}
            {years && <LabelValue label="Years" value={years} />}
          </li>
        );
      })}
    </ul>
  );
}

/** GROUPED BY KIND WS-C 2) */
const SPEC_KIND_ORDER: { key: string; label: string }[] = [
  { key: "PRODUCT", label: "Product" },
  { key: "INDUSTRY", label: "Industry" },
  { key: "METHODOLOGY", label: "Business Process" },
];

export function SpecializationsBody({
  specializations,
  // SAME REASON AS `SkillsBody` : `/join/provider:4012` renders this and
  chipClass,
}: {
  specializations: SpecializationItem[];
  chipClass?: string;
}) {
  if (specializations.length === 0) return <Empty>None listed.</Empty>;
  // A ROW WITH AN UNKNOWN OR MISSING `kind` IS NOT DROPPED — it falls into
  const known = new Set(SPEC_KIND_ORDER.map((k) => k.key));
  const groups = [
    ...SPEC_KIND_ORDER.map((k) => ({
      label: k.label,
      items: specializations.filter((s) => s.kind === k.key),
    })),
    { label: "Other", items: specializations.filter((s) => !s.kind || !known.has(s.kind)) },
  ].filter((g) => g.items.length > 0);

  // ONE GROUP IS NOT A GROUPING. With everything under a single kind the
  if (groups.length === 1)
    return <SpecChips items={groups[0].items} chipClass={chipClass} />;

  return (
    <div>
      {groups.map((g) => (
        <div key={g.label} className="mb-3 last:mb-0">
          {/* The same eyebrow Skills uses for its product families, so the */}
          <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
            {g.label}
          </p>
          <SpecChips items={g.items} chipClass={chipClass} />
        </div>
      ))}
    </div>
  );
}

function SpecChips({
  items,
  /* Threaded from `SpecializationsBody` — see its `chipClass` note. */
  chipClass,
}: {
  items: SpecializationItem[];
  chipClass?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s.id}
          data-row
          className={chipClass ?? CHIP_SPEC}
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
  // THE CHIP LOOK ARRIVES AS A PROP WS-A item 4)
  chipClass,
}: {
  skills: SkillItem[];
  field?: { role: string; domain: string } | null;
  chipClass?: string;
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
              data-row
              className={chipClass ?? CHIP_SKILL}
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

/** Skills + Specializations in ONE band (brief_profile_layout_v2 §3.2). */
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

/** The project card (brief_project_model_v2). */
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
      // SOLO PROJECTS, and it is ALSO rendered NESTED inside a Work History employer. So the
      data-row
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
            // A MONOGRAM, NOT AN EMOJI
            className="grid h-10 w-10 flex-none place-items-center rounded-[8px] bg-magenta/10 text-ink"
          >
            {redacted ? (
              <span className="text-[17px]">🔒</span>
            ) : (
              <span className="text-[14px] font-bold tracking-[0.02em]">
                {projectMonogram(p.name)}
              </span>
            )}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] leading-snug">{p.name}</h3>
            {/* ONE BADGE FOR BOTH LEVELS , WS-C) */}
            {p.validationStatus === "VALIDATED" ? (
              <ValidatedBadge
                validatedAt={p.validatedAt ?? null}
                // The project flow does not record the responder's domain
                validatedBy={null}
              />
            ) : isOwner && p.validationStatus === "PENDING" ? (
              <ValidationPending />
            ) : null}
          </div>
          {title && (
            // Wraps rather than truncates: the confidential form of this line
            <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-2">{title}</p>
          )}
          {range && <p className="text-[12.5px] text-ink-2">{range}</p>}
          {/* THE SEPARATE "Confirmed <date>" LINE IS GONE ( WS-C). The */}
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
        // ONE TAG STYLE item 5)
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.roleType && <span className={CLEAN_CHIP} title={roleLong(p.roleType.name)}>{p.roleType.name}</span>}
          {tools.slice(0, 4).map((t) => (
            <span key={t.id} className={CLEAN_CHIP}>
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

/** Work History — PJv2 WS3, mockup pg1. */
export function WorkHistoryBody({
  employers,
  empty,
  projects = [],
  isOwner = false,
  artifactsFor,
  contactFor,
  condensed = false,
  cap,
  // THE TIMELINE, OPT-IN WS-A item 7)
  timeline = false,
  // THE SAME OPT-IN AS `timeline`, AND FOR THE SAME REASON ( row 12): the role leads
  roleFirst = false,
}: {
  employers: EmployerItem[];
  empty: string;
  /** Role title bold, company grey beneath — passed only by `/profile`. */
  roleFirst?: boolean;
  /** All projects; each entry is given the ones belonging to it. */
  projects?: ProjectItem[];
  isOwner?: boolean;
  /** WS4 / WS5 slots, resolved per employer by the caller. */
  artifactsFor?: (employerId: string) => React.ReactNode;
  contactFor?: (employerId: string) => React.ReactNode;
  /** One tight line per role — the "You're live" page (WS1/E146). */
  condensed?: boolean;
  timeline?: boolean;
  /** Show at most this many entries, the rest behind a "N more — pending" */
  cap?: number;
}) {
  if (employers.length === 0) return <Empty>{empty}</Empty>;
  // E089 — NO divider between entries. The full-width rules were the main reason
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
          <li data-row key={e.id} className={timeline ? "pm-tl-job" : undefined}>
            <WorkHistoryEntry
              employer={e}
              projects={mine}
              isOwner={isOwner}
              artifactsSlot={artifactsFor?.(e.id)}
              contactSlot={contactFor?.(e.id)}
              condensed={condensed}
              roleFirst={roleFirst}
            />
          </li>
        );
      })}
    />
  );
}

/** Solo Projects — PJv2 WS3 / E074, mockup pg2. */
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
      {/* THE SENTENCE IS SAID ONCE item 7) */}
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

/** Artifacts, read-only (PJv2 WS4 / E078a). */
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
              className="inline-flex items-center gap-1.5 border border-magenta/30 bg-magenta/[0.05] px-3 py-1 text-[13px] font-semibold text-magenta-dark transition-colors hover:border-magenta"
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

/** The Validation Contact — Plus's first lever (PJv2 WS5 / E078b). */
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
/** THE COUNTRY RULE, IN ONE PLACE */
export function locationLines(
  location?: string | null,
  country?: string | null
): { primary: string; secondary: string | null } | null {
  // RESOLVED HERE, ONCE, SO EVERY CALLER IS COVERED ( WS-C ruling 4)
  const label = countryName(country, country);
  const primary = location || label;
  if (!primary) return null;
  return {
    primary,
    secondary: location && label && !location.includes(label) ? label : null,
  };
}

export function LocationBody({
  location,
  country,
}: {
  location?: string | null;
  country?: string | null;
}) {
  const lines = locationLines(location, country);
  if (!lines) return <Empty>No location listed.</Empty>;
  return (
    <div className="text-[14.5px]">
      <p>{lines.primary}</p>
      {lines.secondary && <p className="text-ink-2">{lines.secondary}</p>}
    </div>
  );
}

/** AN EMPTY SECTION OFFERS A DOOR WS-C item 16) */
/** One labelled row, so the cert card and the education card read alike. */
/** SCOTT: *"Label : value pairs are unclear… label in grey regular with a colon, value in */
export function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[13px]">
      {/* mockup's #8a869a (see `connect-profile.css`). */}
      <span className="font-normal text-ink-3">{label}:</span>{" "}
      <span className="text-ink">{value}</span>
    </p>
  );
}

export function CertificationsBody({
  certifications,
  empty,
  emptyAction,
}: {
  certifications: CertificationItem[];
  empty: string;
  emptyAction?: ReactNode;
}) {
  if (certifications.length === 0)
    return (
      <>
        <Empty>{empty}</Empty>
        {emptyAction}
      </>
    );
  return (
    <ul className="space-y-3">
      {certifications.map((c, i) => {
        // STACKED AND LABELLED, LIKE EDUCATION (brief 10 WS-B)
        const earned = c.issuedOn ? c.issuedOn.slice(0, 4) : c.year ? String(c.year) : null;
        return (
          <li data-row key={c.id ?? `${c.name}-${i}`} className="text-[14px]">
            <b className="block">{c.name}</b>
            {/* WHERE IT CAME FROM, ON ITS OWN LINE */}
            <CredentialProvenance
              issuedFrom={c.issuedFrom ?? null}
              credentialId={c.credentialId ?? null}
              className="mt-0.5 block"
            />
            {c.issuer && <LabelValue label="Agency" value={c.issuer} />}
            {earned && <LabelValue label="Earned" value={earned} />}
            {c.expiresOn && <LabelValue label="Expires" value={c.expiresOn.slice(0, 4)} />}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-[13px] font-bold text-magenta hover:text-magenta-dark"
              >
                {/* SCOTT RULED IT, 2026-09-29 */}
                View Credential
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
