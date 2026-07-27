import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatCents, displayFullName, rateBreakdown } from "@/lib/display";
import type { ProviderProfileView } from "@/lib/provider-profile-view";

/**
 * The published provider Profile View (brief_S / E037), modelled on the Upwork
 * reference: a narrow left rail (verifications, languages, education,
 * specializations) beside the main column (overview, projects, skills,
 * employment history, certifications, testimonials).
 *
 * This REPLACES the old thin dashboard as the provider's home, so it carries
 * the owner-only bits too — the completeness banner and per-section edit links
 * back into the wizard. A visitor sees the same page without them.
 *
 * Empty sections render an explicit prompt rather than vanishing: on your own
 * profile a missing project list is a to-do, and silently hiding it is how a
 * provider ends up wondering why nobody contacts them.
 */

const LEVEL_LABELS: Record<string, string> = {
  BASIC: "Basic",
  CONVERSATIONAL: "Conversational",
  FLUENT: "Fluent",
  NATIVE_OR_BILINGUAL: "Native or Bilingual",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  MID_CAREER: "Mid-Career",
  EXPERT: "Expert",
};

function Section({
  title,
  editHref,
  children,
}: {
  title: string;
  editHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-line bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[18px]">{title}</h2>
        {editHref && (
          <Link
            href={editHref}
            className="text-[14px] font-bold text-magenta hover:text-magenta-dark"
          >
            ✏️ Edit
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] text-ink-2">{children}</p>;
}

function dateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const y = (d: string | null) => (d ? d.slice(0, 4) : null);
  return `${y(start) ?? "?"} – ${end ? y(end) : "Present"}`;
}

export function ProviderProfileViewPage({ p }: { p: ProviderProfileView }) {
  const fullName = displayFullName(p.person.firstName, p.person.lastName);
  const { youGet } = rateBreakdown(p.rates.hourlyCents, p.serviceFeeBps);

  return (
    <div className="min-h-screen bg-bg-soft font-body text-ink">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Owner-only status banner — the completeness/visibility story the old
            dashboard card used to carry. */}
        {p.isOwner && (
          <div
            className={
              "mb-6 flex flex-wrap items-center justify-between gap-4 rounded-brand border p-5 " +
              (p.visible
                ? "border-emerald-500/30 bg-emerald-50/60"
                : "border-magenta/25 bg-magenta/[0.05]")
            }
          >
            <div>
              <p className="font-bold">
                {p.paused
                  ? "Your profile is paused"
                  : p.visible
                    ? "🎉 You're live — buyers can find you"
                    : `You're at ${p.completeness}% — reach ${p.visibilityThreshold}% to go live`}
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                {p.visible && !p.paused
                  ? "Keep your profile fresh to stay near the top of buyer searches."
                  : "Complete the remaining details to become visible to service buyers."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden w-40 sm:block">
                <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full bg-magenta transition-[width] duration-500"
                    style={{ width: `${Math.min(100, p.completeness)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[12px] font-bold text-magenta">
                  {p.completeness}%
                </p>
              </div>
              <Link
                href="/join/provider"
                className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        )}

        {/* Header card */}
        <header className="rounded-brand border border-line bg-white p-6">
          <div className="flex flex-wrap items-start gap-5">
            <Avatar
              firstName={p.person.firstName}
              lastName={p.person.lastName}
              photoUrl={p.person.photoUrl}
              size={96}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[26px] tracking-[-0.5px]">{fullName}</h1>
                {p.validated && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-extrabold text-emerald-700">
                    ✓ Validated
                  </span>
                )}
              </div>
              <p className="mt-1 text-[17px] text-ink-2">
                {p.headline || "No title yet"}
              </p>
              <p className="mt-1.5 text-[14px] text-ink-2">
                {[
                  p.location,
                  p.field ? `${p.field.role} · ${p.field.domain}` : null,
                  p.experienceLevel
                    ? EXPERIENCE_LABELS[p.experienceLevel] ?? p.experienceLevel
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[26px] font-extrabold">
                {p.rates.hourlyCents != null
                  ? `${formatCents(p.rates.hourlyCents, p.rates.currency)}`
                  : "—"}
                <span className="text-[15px] font-semibold text-ink-2">/hr</span>
              </p>
              {youGet != null && p.isOwner && (
                <p className="text-[13px] text-ink-2">
                  You&apos;ll Get {formatCents(youGet, p.rates.currency)}/hr
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* ---- Left rail --------------------------------------------- */}
          <aside className="space-y-6">
            <Section title="Verifications">
              <ul className="space-y-1.5 text-[14px]">
                <li
                  className={
                    p.verifications.emailVerified
                      ? "font-semibold text-emerald-600"
                      : "text-ink-2"
                  }
                >
                  {p.verifications.emailVerified ? "✓ Email Verified" : "Email not verified"}
                </li>
                <li className="text-ink-2">
                  {p.verifications.phoneVerified
                    ? "✓ Phone Verified"
                    : p.verifications.phoneOnFile
                      ? "Phone on file"
                      : "No phone on file"}
                </li>
              </ul>
            </Section>

            <Section title="Languages" editHref={p.isOwner ? "/join/provider?step=languages" : undefined}>
              {p.languages.length > 0 ? (
                <ul className="space-y-1 text-[14px]">
                  {p.languages.map((l) => (
                    <li key={l.id}>
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
              ) : (
                <Empty>No languages listed.</Empty>
              )}
            </Section>

            <Section title="Education" editHref={p.isOwner ? "/join/provider?step=education" : undefined}>
              {p.education.length > 0 ? (
                <ul className="space-y-2.5 text-[14px]">
                  {p.education.map((e) => (
                    <li key={e.id}>
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
              ) : (
                <Empty>No education listed.</Empty>
              )}
            </Section>

            <Section
              title="Specializations"
              editHref={p.isOwner ? "/join/provider?step=specializations" : undefined}
            >
              {p.specializations.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {p.specializations.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full border border-magenta/30 bg-magenta/[0.06] px-2.5 py-0.5 text-[12.5px] font-semibold text-magenta-dark"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <Empty>None listed.</Empty>
              )}
            </Section>
          </aside>

          {/* ---- Main column ------------------------------------------- */}
          <div className="space-y-6">
            <Section title="Overview" editHref={p.isOwner ? "/join/provider?step=bio" : undefined}>
              {p.overview ? (
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                  {p.overview}
                </p>
              ) : (
                <Empty>No overview yet.</Empty>
              )}
            </Section>

            {/* Projects → Solutions (E037). Renamed from "Portfolio" by
                brief_T / E041 — "we're not artists". */}
            <Section title="Projects">
              {p.projects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {p.projects.map((pr) => (
                    <article
                      key={pr.id}
                      className="rounded-brand border border-line p-4"
                    >
                      <h3 className="text-[15px]">{pr.name}</h3>
                      {pr.employer && (
                        <p className="mt-0.5 text-[13px] text-ink-2">{pr.employer}</p>
                      )}
                      {pr.description && (
                        <p className="mt-2 line-clamp-3 text-[14px] text-ink-2">
                          {pr.description}
                        </p>
                      )}
                      {pr.solutions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {pr.solutions.map((s) => (
                            <span
                              key={s.id}
                              className="rounded-full border border-line px-2.5 py-0.5 text-[12px] font-semibold text-ink-2"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {pr.url && (
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-[13px] font-bold text-magenta hover:text-magenta-dark"
                        >
                          View project →
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <Empty>
                  {p.isOwner
                    ? "No projects yet. Adding a few is the fastest way to show buyers what you've delivered."
                    : "No projects published yet."}
                </Empty>
              )}
            </Section>

            <Section title="Skills" editHref={p.isOwner ? "/join/provider?step=catalog" : undefined}>
              {p.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {p.skills.map((s) => (
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
            </Section>

            {/* E042 — ONE work-history section. The flat WorkExperience
                rendering that used to sit alongside this is gone; Employer is
                the single model and projects nest under the job they were done
                for. */}
            <Section
              title="Work History"
              editHref={p.isOwner ? "/join/provider?step=employers" : undefined}
            >
              {p.employers.length > 0 ? (
                <ul className="space-y-6">
                  {p.employers.map((e) => (
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
                              {dateRange(e.startDate, e.endDate)}
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

                          {e.projects.length > 0 && (
                            <ul className="mt-3 space-y-2 border-l-2 border-line pl-4">
                              {e.projects.map((pr) => (
                                <li key={pr.id}>
                                  <p className="text-[14px] font-semibold">
                                    {pr.name}
                                  </p>
                                  {pr.description && (
                                    <p className="text-[13.5px] text-ink-2">
                                      {pr.description}
                                    </p>
                                  )}
                                  {pr.solutions.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {pr.solutions.map((so) => (
                                        <span
                                          key={so}
                                          className="rounded-full border border-line px-2 py-0.5 text-[12px] font-semibold text-ink-2"
                                        >
                                          {so}
                                        </span>
                                      ))}
                                    </div>
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
              ) : (
                <Empty>
                  {p.isOwner
                    ? "No work history yet. Providers who add work experience and projects are twice as likely to win work."
                    : "No work history yet."}
                </Empty>
              )}
            </Section>

            <Section
              title="Certifications"
              editHref={p.isOwner ? "/join/provider?step=certifications" : undefined}
            >
              {p.certifications.length > 0 ? (
                <ul className="space-y-2">
                  {p.certifications.map((c) => (
                    <li key={c.id} className="text-[14px]">
                      <b>{c.name}</b>
                      <span className="text-ink-2">
                        {[
                          c.issuer,
                          c.issuedOn ? c.issuedOn.slice(0, 4) : c.year,
                          c.expiresOn ? `expires ${c.expiresOn.slice(0, 4)}` : null,
                        ].filter(Boolean).length > 0 &&
                          ` — ${[
                            c.issuer,
                            c.issuedOn ? c.issuedOn.slice(0, 4) : c.year,
                            c.expiresOn ? `expires ${c.expiresOn.slice(0, 4)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}`}
                      </span>
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
                      {c.notes && (
                        <p className="text-[13px] text-ink-2">{c.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>
                  {p.isOwner
                    ? "No certifications yet. Adding your credentials increases your chances of getting hired."
                    : "No certifications listed."}
                </Empty>
              )}
            </Section>

            {/* E039 — testimonials are EARNED after delivering work, so this
                is an honest empty state, not a capture form. */}
            <Section title="Testimonials">
              <Empty>
                {p.isOwner
                  ? "No testimonials yet — you'll collect these as you deliver work."
                  : "No testimonials yet."}
              </Empty>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
