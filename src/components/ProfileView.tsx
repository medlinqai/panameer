import { RichText } from "@/components/profile/RichText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SkillChip } from "@/components/SkillChip";
import {
  formatRate,
  humanizeToken,
  type PublicProviderProfile,
} from "@/lib/types";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="text-amber-500"
        aria-hidden
      >
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      {rating.toFixed(1)}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "Present";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Full, read-only provider profile. Shared by /profile and /providers/[id]. */
export function ProfileView({ profile }: { profile: PublicProviderProfile }) {
  const { person, rates } = profile;
  const onsite = formatRate(rates.onsiteCents, rates.currency);
  const remote = formatRate(rates.remoteCents, rates.currency);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header card */}
      <Card>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            firstName={person.firstName}
            lastName={person.lastName}
            photoUrl={person.photoUrl}
            size={88}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {person.firstName} {person.lastName}
              </h1>
              {profile.validated && (
                <Badge tone="green">✓ Validated</Badge>
              )}
              {profile.rating !== null && <StarRating rating={profile.rating} />}
            </div>
            <p className="mt-1 text-lg text-black/70 dark:text-white/70">
              {profile.headline}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* WS6 (E068) — the self-reported experience LEVEL badge is gone.
                  Years are DERIVED from the work history and shown in the hero on
                  the main profile surface; this older public view simply stops
                  asserting a grade the provider gave themselves. */}
              {profile.region && <Badge>{profile.region.name}</Badge>}
              {profile.workTypes.map((w) => (
                <Badge key={w}>{humanizeToken(w)}</Badge>
              ))}
            </div>
          </div>

          {(onsite || remote) && (
            <div className="flex gap-6 sm:flex-col sm:gap-2 sm:text-right">
              {remote && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                    Remote
                  </p>
                  <p className="text-lg font-semibold">{remote}</p>
                </div>
              )}
              {onsite && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                    Onsite
                  </p>
                  <p className="text-lg font-semibold">{onsite}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {profile.overview && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Overview
          </h2>
          <RichText
            text={profile.overview}
            clampLines={8}
            className="leading-relaxed text-black/80 dark:text-white/80"
          />
        </Card>
      )}

      {profile.skills.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <SkillChip key={s.id} label={s.name} />
            ))}
          </div>
        </Card>
      )}

      {profile.specializations.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Specializations
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.specializations.map((s) => (
              <SkillChip key={s.id} label={s.name} />
            ))}
          </div>
        </Card>
      )}

      {profile.experience.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Work Experience
          </h2>
          <ol className="space-y-5">
            {profile.experience.map((exp) => (
              <li
                key={exp.id}
                className="border-l-2 border-black/10 pl-4 dark:border-white/15"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-medium">{exp.roleTitle}</h3>
                  <span className="text-sm text-black/50 dark:text-white/50">
                    {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                  </span>
                </div>
                <p className="text-sm text-black/70 dark:text-white/70">
                  {exp.employer}
                </p>
                {exp.description && (
                  <div className="mt-1 text-sm">
                    <RichText
                      text={exp.description}
                      clampLines={4}
                      className="leading-relaxed text-black/70 dark:text-white/70"
                    />
                  </div>
                )}
                {exp.projects.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.projects.map((p) => (
                      <li
                        key={p.id}
                        className="text-sm text-black/60 dark:text-white/60"
                      >
                        <span className="font-medium text-black/75 dark:text-white/75">
                          {p.name}
                        </span>
                        {p.description ? ` — ${p.description}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {(profile.education.length > 0 || profile.languages.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {profile.education.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Education
              </h2>
              <ul className="space-y-2">
                {profile.education.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium">{e.institution}</p>
                    <p className="text-black/60 dark:text-white/60">
                      {[e.degree, e.field, e.year].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {profile.languages.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Languages
              </h2>
              <ul className="space-y-1">
                {profile.languages.map((l) => (
                  <li key={l.id} className="text-sm">
                    <span className="font-medium">{l.name}</span>
                    {l.proficiency ? (
                      <span className="text-black/60 dark:text-white/60">
                        {" "}
                        — {l.proficiency}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
