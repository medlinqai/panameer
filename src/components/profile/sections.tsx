import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { formatCents, displayFullName } from "@/lib/display";

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

export const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  MID_CAREER: "Mid-Career",
  EXPERT: "Expert",
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
    <section
      id={id}
      className="scroll-mt-24 rounded-brand border border-line bg-white p-6"
    >
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
}: {
  title: string;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${title}`}
      className={EDIT_CLASS}
    >
      ✏️ {label}
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
  logoUrl?: string | null;
  highlights?: string[];
  roleType?: { id: string; name: string } | null;
  industry?: { id: string; name: string } | null;
  applications?: { id: string; name: string }[];
  outcomes?: { id?: string; label: string; value: string }[];
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
 * The profile header — photo, name, headline, location/field/level, rate.
 *
 * `aside` carries whatever each surface hangs off the header: the review page
 * puts "Change Photo" and the identity state there, the published page puts
 * nothing.
 */
export function ProfileHeaderCard({
  firstName,
  lastName,
  photoUrl,
  headline,
  location,
  field,
  experienceLevel,
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
  experienceLevel?: string | null;
  validated?: boolean;
  hourlyCents?: number | null;
  currency?: string;
  /** Shown to the OWNER only — the take-home after the service fee. */
  youGetCents?: number | null;
  aside?: ReactNode;
}) {
  const meta = [
    location,
    field ? `${field.role} · ${field.domain}` : null,
    experienceLevel
      ? EXPERIENCE_LABELS[experienceLevel] ?? experienceLevel
      : null,
  ].filter(Boolean);

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
  return (
    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
      {overview}
    </p>
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

export function ProjectsBody({
  projects,
  empty,
}: {
  projects: ProjectItem[];
  empty: string;
}) {
  if (projects.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((pr) => (
        <ProjectCard key={pr.id} p={pr} />
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
export function ProjectCard({ p }: { p: ProjectItem }) {
  const { title, redacted } = clientLabel(p);
  const tools = p.applications ?? [];
  const outcomes = p.outcomes ?? [];
  const range = dateRange(
    p.startDate ?? null,
    p.endDate ?? null,
    p.isCurrent ?? false
  );

  return (
    <article className="flex flex-col rounded-brand border border-line p-4 transition-shadow hover:shadow-brand">
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
            {/* Validated badge SLOT — deliberately empty this brief; the
                validation workflow that fills it is the next one. */}
            {p.validationStatus === "VALIDATED" && (
              <span className="flex-none rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                ✓ Validated
              </span>
            )}
          </div>
          {title && (
            // Wraps rather than truncates: the confidential form of this line
            // ("Project Falcon · Confidential — Energy Services") is the whole
            // substitute for the client name, and clipping it to "Confidential
            // — E…" throws away the industry it exists to show.
            <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-2">{title}</p>
          )}
          {range && <p className="text-[12.5px] text-ink-2">{range}</p>}
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
        <p className="mt-3 line-clamp-3 text-[14px] text-ink-2">{p.description}</p>
      )}

      {(p.highlights?.length ?? 0) > 0 && (
        <ul className="mt-2 space-y-1">
          {p.highlights!.slice(0, 3).map((h, i) => (
            <li key={i} className="flex gap-2 text-[13.5px] text-ink-2">
              <span className="text-magenta">•</span>
              <span className="line-clamp-2">{h}</span>
            </li>
          ))}
        </ul>
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
 * E042 — Employer is the ONE work-history model, and projects nest under the
 * job they were delivered for.
 */
export function WorkHistoryBody({
  employers,
  empty,
}: {
  employers: EmployerItem[];
  empty: string;
}) {
  if (employers.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="space-y-6">
      {employers.map((e) => (
        <li key={e.id}>
          <div className="flex items-start gap-3">
            {e.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.logoUrl}
                alt=""
                className="mt-0.5 h-10 w-10 flex-none rounded-[8px] border border-line bg-white object-contain p-1"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">
                  {e.roleTitle ? `${e.roleTitle} · ` : ""}
                  {e.name}
                </p>
                <p className="text-[13px] text-ink-2">
                  {dateRange(
                    e.startDate ?? null,
                    e.endDate ?? null,
                    e.isCurrent ?? false
                  )}
                </p>
              </div>
              {e.location && (
                <p className="text-[13px] text-ink-2">{e.location}</p>
              )}
              {e.description && (
                <p className="mt-1.5 whitespace-pre-line text-[14px] text-ink-2">
                  {e.description}
                </p>
              )}
              {(e.projects?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">
                  {e.projects!.map((pr) => (
                    <li key={pr.id}>
                      <p className="text-[14px] font-semibold">{pr.name}</p>
                      {pr.description && (
                        <p className="text-[13.5px] text-ink-2">
                          {pr.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
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
            {c.notes && <p className="text-[13px] text-ink-2">{c.notes}</p>}
          </li>
        );
      })}
    </ul>
  );
}
