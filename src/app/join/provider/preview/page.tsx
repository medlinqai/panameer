import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getOnboardingState, OnboardingError } from "@/lib/onboarding";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import {
  displayFirstName,
  displayFullName,
  formatCents,
  bpsToPercentLabel,
  rateBreakdown,
} from "@/lib/display";

/**
 * "Preview Profile" — the review page after Publish (brief_P / E019).
 *
 * Shows everything the provider entered with a per-section edit pencil, plus —
 * the part the walk specifically called for — any IMPORT GAPS: fields we
 * couldn't decipher or had to strip from a résumé / LinkedIn PDF (E012). A
 * silent partial import is the failure mode this page exists to prevent.
 */
export default async function ProviderPreviewPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/provider/preview");

  let state: Awaited<ReturnType<typeof getOnboardingState>>;
  try {
    state = await getOnboardingState(viewer);
  } catch (e) {
    if (e instanceof OnboardingError) redirect("/dashboard");
    throw e;
  }

  if (!state.emailVerified) redirect("/join/provider");

  const p = state.profile;
  const firstName = displayFirstName(p.firstName);
  const fullName = displayFullName(p.firstName, p.lastName);
  const { fee, youGet } = rateBreakdown(p.hourlyRateCents, p.serviceFeeBps);

  const location = [p.address?.city, p.address?.state, p.address?.country]
    .filter(Boolean)
    .join(", ");

  // Gaps across every import attempt, newest first, de-duplicated.
  const gaps = [...new Set(state.imports.flatMap((i) => i.gaps))];
  const failedImports = state.imports.filter((i) => i.status === "FAILED");

  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Logo priority />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:py-14">
        <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
          Looking good, {firstName}!
        </h1>
        <p className="mt-2 text-[17px] text-ink-2">
          Make edits, then submit — you can change anything after it&apos;s live.
        </p>

        {/* Import gaps (E019) */}
        {(gaps.length > 0 || failedImports.length > 0) && (
          <section className="mt-8 rounded-brand border border-amber-500/30 bg-amber-50/60 p-5">
            <h2 className="text-[16px] font-bold">Check These Imported Details</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              We imported what we could read. These parts need your attention:
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-ink-2">
              {failedImports.map((i) => (
                <li key={i.id}>
                  <b className="text-ink">{i.fileName ?? "Your file"}</b> couldn&apos;t
                  be read{i.error ? ` — ${i.error}` : "."}
                </li>
              ))}
              {gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 space-y-4">
          <Section title="Name & Location" href="/join/provider?step=finish">
            <div className="flex items-center gap-4">
              <Avatar
                firstName={p.firstName}
                lastName={p.lastName}
                photoUrl={p.photoUrl}
                size={64}
              />
              <div>
                <p className="text-[18px] font-bold">{fullName || "—"}</p>
                <p className="text-[14px] text-ink-2">{location || "Location not set"}</p>
              </div>
            </div>
          </Section>

          <Section title="Title" href="/join/provider?step=title">
            <p>{p.headline || <Missing>No title yet</Missing>}</p>
          </Section>

          <Section title="Bio" href="/join/provider?step=bio">
            {p.overview ? (
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                {p.overview}
              </p>
            ) : (
              <Missing>No bio yet</Missing>
            )}
          </Section>

          <Section title="Rate" href="/join/provider?step=rate">
            {p.hourlyRateCents != null ? (
              <dl className="space-y-1.5 text-[15px]">
                <Line label="Hourly rate" value={`${formatCents(p.hourlyRateCents)}/hr`} />
                <Line
                  label={`Service fee (${bpsToPercentLabel(p.serviceFeeBps)})`}
                  value={fee != null ? `−${formatCents(fee)}` : "—"}
                />
                <Line
                  label="You'll get"
                  value={youGet != null ? `${formatCents(youGet)}/hr` : "—"}
                  strong
                />
              </dl>
            ) : (
              <Missing>No rate set</Missing>
            )}
          </Section>

          <Section title="Work & Skills" href="/join/provider?step=skills">
            <p className="text-[14px] text-ink-2">
              {/* The field is the (Role, Domain) pair (brief_R). */}
              {p.roleTypeName && p.pillarName ? (
                `${p.roleTypeName} · ${p.pillarName}`
              ) : (
                <Missing>No field chosen</Missing>
              )}
            </p>
            {p.skillNames.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {p.skillNames.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full border border-line px-3 py-1 text-[13.5px] font-semibold text-ink-2"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-2">
                <Missing>No skills yet</Missing>
              </div>
            )}
          </Section>

          <Section
            title="Specializations"
            href="/join/provider?step=specializations"
          >
            {p.specializations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {p.specializations.map((sp) => (
                  <span
                    key={sp.id}
                    className="rounded-full border border-magenta/30 bg-magenta/[0.06] px-3 py-1 text-[13.5px] font-semibold text-magenta-dark"
                  >
                    {sp.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[14px] text-ink-2">
                None added (optional)
              </span>
            )}
          </Section>

          <Section title="Experience" href="/join/provider?step=tell_us">
            {p.experiences.length > 0 ? (
              <ul className="space-y-3">
                {p.experiences.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">{e.roleTitle}</p>
                    <p className="text-[14px] text-ink-2">
                      {e.employer}
                      {e.startDate && (
                        <>
                          {" · "}
                          {e.startDate.slice(0, 4)}–{e.endDate ? e.endDate.slice(0, 4) : "present"}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Missing>No work history yet</Missing>
            )}
          </Section>

          <Section title="Education" href="/join/provider?step=education">
            {p.education.length > 0 ? (
              <ul className="space-y-2">
                {p.education.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">{e.institution}</p>
                    <p className="text-[14px] text-ink-2">
                      {[e.degree, e.field].filter(Boolean).join(", ")}
                      {(e.startYear || e.endYear) && (
                        <> · {[e.startYear, e.endYear].filter(Boolean).join("–")}</>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[14px] text-ink-2">None added (optional)</span>
            )}
          </Section>

          <Section title="Languages" href="/join/provider?step=languages">
            {p.languages.length > 0 ? (
              <ul className="space-y-1 text-[15px]">
                {p.languages.map((l) => (
                  <li key={l.id}>
                    <b>{l.name}</b>
                    {l.level && (
                      <span className="text-ink-2"> — {LEVEL_LABELS[l.level] ?? l.level}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Missing>No languages yet</Missing>
            )}
          </Section>

          <Section title="Verifications" href="/join/provider?step=finish">
            <ul className="space-y-1.5 text-[15px]">
              <li>
                {p.phoneVerified ? (
                  <span className="font-semibold text-emerald-600">✓ Phone Verified</span>
                ) : (
                  <Missing>Phone not verified</Missing>
                )}
              </li>
              <li>
                <span className="font-semibold text-emerald-600">✓ Email Verified</span>
              </li>
            </ul>
          </Section>
        </div>

        {/* Completeness + what happens next */}
        <section className="mt-8 rounded-brand border border-line p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold">Profile Completeness</span>
            <span className="text-[16px] font-extrabold text-magenta">
              {state.completeness}%
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-magenta transition-[width] duration-500"
              style={{ width: `${Math.min(100, state.completeness)}%` }}
            />
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            {state.visible ? (
              <>
                🎉 You&apos;re live — all service buyers can find you.
              </>
            ) : (
              <>
                Reach {state.visibilityThreshold}% to become visible to service
                buyers. Getting validated later also unlocks premium buyers.
              </>
            )}
          </p>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <Link
            href="/dashboard"
            className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/join/provider"
            className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Keep Editing
          </Link>
        </div>
      </main>
    </div>
  );
}

const LEVEL_LABELS: Record<string, string> = {
  BASIC: "Basic",
  CONVERSATIONAL: "Conversational",
  FLUENT: "Fluent",
  NATIVE_OR_BILINGUAL: "Native or Bilingual",
};

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-brand border border-line p-5">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
          {title}
        </h2>
        <Link
          href={href}
          aria-label={`Edit ${title}`}
          className="shrink-0 text-[14px] font-bold text-magenta hover:text-magenta-dark"
        >
          ✏️ Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

function Missing({ children }: { children: React.ReactNode }) {
  return <span className="text-[14px] font-semibold text-amber-700">{children}</span>;
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "font-bold" : "text-ink-2"}>{label}</dt>
      <dd className={strong ? "font-extrabold" : "font-semibold"}>{value}</dd>
    </div>
  );
}
