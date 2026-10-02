import Link from "next/link";
import Image from "next/image";
import { EMPLOYER_LOCK_COPY, RATE_LOCKED_COPY } from "@/lib/masked-profile";
import type { NamedProfile } from "@/lib/named-profile";
import { browseAllowed } from "@/lib/public-browse-limit";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import {
  Chip,
  LockLine,
  MaskedAvatarLarge,
  PublicPrimary,
  PublicSecondary,
} from "@/components/public/masked-ui";

/**
 * ── ⚠⚠⚠ THE NAMED PUBLIC PROFILE — `/in/<slug>`, OPT-IN (`P2-A1.1-E738`) ──
 *
 * ⚠⚠ **IT RENDERS ONLY WHAT SCOTT LISTED AS "ON":** *"name, photo, employers
 * shown to anyone, no sign-in; client names follow `clientNameVisibility`;
 * rates and contact need a free sign-up."*
 *
 * ⚠⚠⚠ **THREE THINGS ARE STILL WITHHELD HERE AND THAT IS NOT AN OVERSIGHT:**
 *   · ⚠ **THE RATE** — not in the payload at all (`NamedProfile` extends
 *     `MaskedProfile`, which has no rate field). Scott: *"rates and contact need
 *     a free sign-up."*
 *   · ⚠ **CONTACT DETAILS** — same; there is no email or phone field to render.
 *   · ⚠⚠ **CLIENT NAMES** — scrubbed from free text in `getNamedProfile`,
 *     because `clientNameVisibility`'s visitor arm withholds them even on a
 *     `PUBLIC` project. ⚠⚠⚠ **A MEMBER OPTING IN TO THEIR OWN NAME IS NOT
 *     OPTING IN ON A CLIENT'S BEHALF.**
 *
 * ⚠ This component CANNOT be used for a member who has not opted in: it takes
 * `NamedProfile`, and `getNamedProfile` returns null for everybody else.
 */
export async function NamedProfilePage({
  p,
  slug,
}: {
  p: NamedProfile;
  slug: string;
}) {
  /* ⚠ The same best-effort brake as the masked surfaces. ⚠⚠ It is applied even
     though this page is explicitly public: the member published their NAME, not
     a bulk feed of their work history. */
  if (!(await browseAllowed())) {
    return (
      <Shell>
        <div className="mx-auto max-w-[620px] py-12 text-center">
          <h1 className="text-[24px] font-bold">One moment</h1>
          <p className="mt-3 text-[15px] text-ink-2">
            That was a lot of requests in a short time. Give it a few seconds and
            reload.
          </p>
        </div>
      </Shell>
    );
  }

  const who = `${p.named.firstName} ${p.named.lastName}`.trim();
  /* ⚠ `/pro/`, renamed from `/in/` (`P2-A1.1-E756`). */
  const dest = `/pro/${slug}`;
  const joinHref = `/join?callbackUrl=${encodeURIComponent(dest)}`;
  const signInHref = `/login?callbackUrl=${encodeURIComponent(dest)}`;

  const meta = [
    p.location,
    p.experience ? `${p.experience} experience` : null,
    p.memberSince ? `Member since ${p.memberSince}` : null,
  ].filter(Boolean) as string[];

  return (
    <Shell>
      <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-12">
        <aside>
          {/* ⚠⚠ THE REAL PHOTO, BECAUSE THE MEMBER ASKED FOR IT. ⚠ `alt` names
              them, which is correct here and is exactly what `MaskedAvatar`
              refuses to do on the masked page. */}
          {p.named.photoUrl ? (
            <Image
              src={p.named.photoUrl}
              alt={who}
              width={260}
              height={260}
              className="aspect-square w-full max-w-[160px] rounded-[4px] border border-line object-cover sm:max-w-none dark:border-white/15"
            />
          ) : (
            <MaskedAvatarLarge />
          )}

          <div className="mt-6 border-t border-line pt-4 dark:border-white/15">
            <h2 className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">
              SEARCH SCORE
            </h2>
            <div className="flex items-baseline justify-between py-[3px] text-[14px]">
              <span className="text-ink-2">Score</span>
              <b className="font-bold">{p.score} / 100</b>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4 dark:border-white/15">
            <h2 className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">
              RATES
            </h2>
            {/* ⚠ Still locked — see the block comment. */}
            <LockLine>{RATE_LOCKED_COPY}</LockLine>
          </div>

          <div className="mt-5 border-t border-line pt-4 dark:border-white/15">
            {/* ⚠⚠ SCOTT'S WORDING, VERBATIM: *"Join free to contact <first
                name>"*. ⚠ First name only — it reads like a person, and the
                surname is already in the `<h1>` above. */}
            <PublicPrimary href={joinHref} className="w-full">
              {`Join Free to Contact ${p.named.firstName}`.trim()}
            </PublicPrimary>
          </div>
        </aside>

        <main>
          {/* ⚠⚠ THE NAME **IS** THE `<h1>` HERE — the opposite of the masked
              page, and the whole point of the opt-in. */}
          <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]">{who}</h1>
          <p className="mt-1 text-[16px] font-semibold text-ink-2">{p.title}</p>

          {meta.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-ink-2">
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          )}

          {p.summary && (
            <p className="mt-4 max-w-[680px] text-[14.5px] leading-relaxed text-ink-2">
              {p.summary}
            </p>
          )}

          {p.skills.length > 0 && (
            <Section label="Skills" count={p.skillCount} open>
              <div className="flex flex-wrap gap-1.5 pb-5">
                {p.skills.slice(0, 12).map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
                {p.skillCount > 12 && <Chip>+{p.skillCount - 12} more</Chip>}
              </div>
            </Section>
          )}

          {p.certifications.length > 0 && (
            <Section label="Certifications" count={p.certifications.length}>
              <div className="flex flex-wrap gap-1.5 pb-5">
                {p.certifications.map((c, i) => (
                  <Chip key={`${c}-${i}`}>{c}</Chip>
                ))}
              </div>
            </Section>
          )}

          {p.named.employers.length > 0 && (
            <Section label="Work History" count={p.named.employers.length} open>
              <div className="pb-5">
                {p.named.employers.map((e) => (
                  <div
                    key={e.id}
                    className="relative pb-[22px] pl-7 before:absolute before:left-[3px] before:top-2.5 before:bottom-[-6px] before:border-l before:border-dashed before:border-magenta after:absolute after:left-0 after:top-[7px] after:h-2 after:w-2 after:rounded-full after:bg-magenta last:pb-0 last:before:hidden"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <h3 className="text-[15px] font-semibold">
                        {e.roleTitle ?? "Consulting engagement"}
                      </h3>
                      {e.dates && (
                        <span className="text-[13.5px] text-ink-2">{e.dates}</span>
                      )}
                    </div>
                    {/* ⚠⚠ THE EMPLOYER IS NAMED — the opt-in's second promise.
                        ⚠ A row with no stored name falls back to the lock line
                        rather than rendering a blank. */}
                    <p className="mt-1 text-[13.5px] text-ink-2">
                      {e.name?.trim() ? e.name : <LockLine>{EMPLOYER_LOCK_COPY}</LockLine>}
                    </p>
                    {e.lines.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {e.lines.map((l) => (
                          <li key={l.id} className="text-[13.5px] text-ink-2">
                            {l.roleTitle ?? "Project"}
                            {l.dates ? ` · ${l.dates}` : ""}
                            {l.industry ? ` · ${l.industry}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {p.education.length > 0 && (
            <Section label="Education" count={p.education.length}>
              {/* ⚠⚠ STILL DEGREE AND FIELD ONLY. The school name was never
                  selected by the masked read this extends, and the opt-in Scott
                  described names the MEMBER and their EMPLOYERS — not their
                  school. ⚠ Reported rather than assumed. */}
              <ul className="space-y-1 pb-5 text-[13.5px] text-ink-2">
                {p.education.map((e, i) => (
                  <li key={`${e}-${i}`}>{e}</li>
                ))}
              </ul>
            </Section>
          )}

          {p.languages.length > 0 && (
            <Section label="Languages" count={p.languages.length}>
              <div className="flex flex-wrap gap-1.5 pb-5">
                {p.languages.map((l) => (
                  <Chip key={l}>{l}</Chip>
                ))}
              </div>
            </Section>
          )}

          {p.learnPaths.length > 0 && (
            <Section label="Teaches on Panameer" count={p.learnPaths.length}>
              <ul className="space-y-1 pb-5 text-[13.5px] text-ink-2">
                {p.learnPaths.map((t, i) => (
                  <li key={`${t}-${i}`}>{t}</li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ink p-[22px] dark:border-white/40">
            <div>
              <h2 className="text-[18px] font-bold">
                {`Work with ${p.named.firstName}`.trim()}
              </h2>
              <p className="mt-1 max-w-[460px] text-[13.5px] text-ink-2">
                Join free to see rates, message {p.named.firstName} and hire
                through Panameer.
              </p>
            </div>
            <PublicPrimary href={joinHref}>Join Free</PublicPrimary>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-[13.5px] text-ink-2">
            <PublicSecondary href="/explore">Browse Talent</PublicSecondary>
            <span>
              Already a member?{" "}
              <Link
                href={signInHref}
                className="font-semibold text-magenta-dark hover:underline dark:text-magenta"
              >
                Sign In
              </Link>
            </span>
          </div>
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink dark:bg-ink dark:text-white">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1120px] px-6 py-9 sm:py-12">{children}</div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Section({
  label,
  count,
  open,
  children,
}: {
  label: string;
  count: number;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="border-t border-line last:border-b dark:border-white/15">
      <summary className="flex cursor-pointer items-center justify-between py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
        <span>
          {label}{" "}
          <small className="ml-1 text-[13px] font-medium text-ink-3">({count})</small>
        </span>
        <span aria-hidden className="text-ink-3">
          ⌄
        </span>
      </summary>
      {children}
    </details>
  );
}
