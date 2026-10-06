import Link from "next/link";
import {
  EMPLOYER_LOCK_COPY,
  RATE_LOCKED_COPY,
  type MaskedProfile,
} from "@/lib/masked-profile";
import { PLACEHOLDER } from "@/lib/masked-photo";
import { ValidatedBadge } from "@/components/profile/ValidatedBadge";
import {
  Chip,
  BlurredField,
  LockLine,
  MaskedAvatarLarge,
  PublicPrimary,
  PublicSecondary,
} from "@/components/public/masked-ui";

export function MaskedProfileView({
  p,
  joinHref,
  signInHref,
}: {
  p: MaskedProfile;
  joinHref: string;
  signInHref: string;
}) {
  const sections: { label: string; count: number; body: React.ReactNode; open?: boolean }[] = [];

  if (p.skills.length > 0) {
    sections.push({
      label: "Skills",
      count: p.skillCount,
      open: true,
      body: (
        <div className="flex flex-wrap gap-1.5 pb-5">
          {p.skills.slice(0, 12).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
          {p.skillCount > 12 && <Chip>+{p.skillCount - 12} more</Chip>}
        </div>
      ),
    });
  }

  if (p.certifications.length > 0) {
    sections.push({
      label: "Certifications",
      count: p.certifications.length,
      body: (
        <div className="flex flex-wrap gap-1.5 pb-5">
          {p.certifications.map((c, i) => (
            <Chip key={`${c}-${i}`}>{c}</Chip>
          ))}
        </div>
      ),
    });
  }

  if (p.employers.length > 0) {
    sections.push({
      label: "Work History",
      count: p.employers.length,
      open: true,
      body: (
        <div className="pb-5">
          {p.employers.map((e, i) => (
            <div
              key={e.id}
              className="relative pb-[22px] pl-7 before:absolute before:left-[3px] before:top-2.5 before:bottom-[-6px] before:border-l before:border-dashed before:border-magenta after:absolute after:left-0 after:top-[7px] after:h-2 after:w-2 after:rounded-full after:bg-magenta last:pb-0 last:before:hidden"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                {/* A role title is what the member DID, not who they are. */}
                <h3 className="text-[15px] font-semibold">
                  {e.roleTitle ?? "Consulting engagement"}
                  {/* THE BADGE SHOWS ON THE MASKED PREVIEW TOO ( WS-C) — */}
                  {e.validated && <ValidatedBadge validatedAt={null} validatedBy={null} />}
                </h3>
                {e.dates && <span className="text-[13.5px] text-ink-2">{e.dates}</span>}
              </div>
              {/* SCOTT'S ANSWER 6 — role + dates + the lock line, and NO */}
              {/* THE EMPLOYER NAME RENDERS IN PLACE, BLURRED — the row */}
              <div className="mt-1 text-[13.5px] text-ink-2">
                <BlurredField label="Employer hidden — join free to see it">
                  {PLACEHOLDER.employer}
                </BlurredField>
              </div>
              <div className="mt-1 text-[13.5px] text-ink-2">
                <LockLine>{EMPLOYER_LOCK_COPY}</LockLine>
              </div>
              {e.lines.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {e.lines.map((l) => (
                    <li key={l.id} className="text-[13.5px] text-ink-2">
                      {l.roleTitle ?? "Project"}
                      {" · "}
                      {/* The CLIENT, blurred and constant — `MaskedEmployerRow` */}
                      <BlurredField label="Client hidden — join free to see it">
                        {PLACEHOLDER.client}
                      </BlurredField>
                      {l.dates ? ` · ${l.dates}` : ""}
                      {l.validated && <ValidatedBadge validatedAt={null} validatedBy={null} />}
                      {/* Industry ONLY where the column is populated — 3 of */}
                      {l.industry ? ` · ${l.industry}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {i === p.employers.length - 1 && null}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (p.education.length > 0) {
    sections.push({
      label: "Education",
      count: p.education.length,
      body: (
        <ul className="space-y-1 pb-5 text-[13.5px] text-ink-2">
          {/* DEGREE AND FIELD. The school name is not in the payload. */}
          {p.education.map((e, i) => (
            <li key={`${e}-${i}`}>{e}</li>
          ))}
        </ul>
      ),
    });
  }

  if (p.packages.length > 0) {
    sections.push({
      label: "Services",
      count: p.packages.length,
      body: (
        /* SCOTT'S ANSWER 10: *"Packages: titles only, no price or cover."* */
        <ul className="space-y-1 pb-5 text-[13.5px] text-ink-2">
          {p.packages.map((t, i) => (
            <li key={`${t}-${i}`}>{t}</li>
          ))}
        </ul>
      ),
    });
  }

  if (p.learnPaths.length > 0) {
    sections.push({
      label: "Teaches on Panameer",
      count: p.learnPaths.length,
      body: (
        <ul className="space-y-1 pb-5 text-[13.5px] text-ink-2">
          {p.learnPaths.map((t, i) => (
            <li key={`${t}-${i}`}>{t}</li>
          ))}
        </ul>
      ),
    });
  }

  if (p.languages.length > 0) {
    sections.push({
      label: "Languages",
      count: p.languages.length,
      body: (
        <div className="flex flex-wrap gap-1.5 pb-5">
          {p.languages.map((l) => (
            <Chip key={l}>{l}</Chip>
          ))}
        </div>
      ),
    });
  }

  const meta = [
    p.location,
    p.experience ? `${p.experience} experience` : null,
    p.memberSince ? `Member since ${p.memberSince}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-8 md:grid-cols-[260px_1fr] md:gap-12">
      <aside>
        <MaskedAvatarLarge blur={p.photoBlur} />

        {/* SCOTT'S ANSWER 5: the Search Score SHOWS on the masked page. */}
        <div className="mt-6 border-t border-line pt-4 dark:border-white/15">
          <h4 className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">
            SEARCH SCORE
          </h4>
          <div className="flex items-baseline justify-between py-[3px] text-[14px]">
            <span className="text-ink-2">Score</span>
            <b className="font-bold">{p.score} / 100</b>
          </div>
        </div>

        <div className="mt-5 border-t border-line pt-4 dark:border-white/15">
          <h4 className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">
            RATES
          </h4>
          {/* THERE IS NO BLURRED FIGURE HERE, AND THE MOCKUP'S BLUR IS WHY */}
          {/* A BLURRED FIGURE AT LAST — AND READ THE NOTE ABOVE BEFORE */}
          <div className="mb-1 text-[18px] font-bold">
            <BlurredField label="Rate hidden — register free to see it">
              {PLACEHOLDER.rate}
            </BlurredField>
          </div>
          <LockLine>{RATE_LOCKED_COPY}</LockLine>
        </div>

        {/* CONTACT — it did not render at all before, so the page did not show */}
        <div className="mt-5 border-t border-line pt-4 dark:border-white/15">
          <h4 className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">CONTACT</h4>
          <div className="mb-1 text-[14px]">
            <BlurredField label="Contact details hidden — register free to see them">
              {PLACEHOLDER.contact}
            </BlurredField>
          </div>
          <LockLine>Join free to see who this is</LockLine>
        </div>

        <div className="mt-5 border-t border-line pt-4 dark:border-white/15">
          <PublicPrimary href={joinHref} className="w-full">
            Register Free to Contact
          </PublicPrimary>
        </div>
      </aside>

      <main>
        {/* THE `<h1>` IS THE TITLE, NEVER THE NAME — and the page's */}
        {/* THE NAME IS SHOWN AS A BLURRED PLACEHOLDER, NOT WITHHELD . */}
        <BlurredField label="Name hidden — join free to see it" className="text-[20px] font-bold">
          {PLACEHOLDER.name}
        </BlurredField>
        <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[28px]">{p.title}</h1>

        {meta.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-ink-2">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}

        {/* SCRUBBED SERVER-SIDE, OR ABSENT. `scrub()` returns null rather */}
        {p.summary && (
          <p className="mt-4 max-w-[680px] text-[14.5px] leading-relaxed text-ink-2">
            {p.summary}
          </p>
        )}

        {p.industries.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.industries.map((i) => (
              <Chip key={i}>{i}</Chip>
            ))}
          </div>
        )}

        <div className="mt-6">
          {sections.map((s) => (
            // NATIVE `<details>`: this page is reached signed out and the
            <details
              key={s.label}
              open={s.open}
              className="border-t border-line last:border-b dark:border-white/15"
            >
              <summary className="flex cursor-pointer items-center justify-between py-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                <span>
                  {s.label}{" "}
                  <small className="ml-1 text-[13px] font-medium text-ink-3">
                    ({s.count})
                  </small>
                </span>
                <span aria-hidden className="text-ink-3">
                  ⌄
                </span>
              </summary>
              {s.body}
            </details>
          ))}
        </div>

        {/* THE END CARD — the brief's wording, verbatim. */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-ink p-[22px] dark:border-white/40">
          <div>
            <h2 className="text-[18px] font-bold">See who this is</h2>
            <p className="mt-1 max-w-[460px] text-[13.5px] text-ink-2">
              Register free to see their name, photo, employers and rates, and to
              message or hire them.
            </p>
          </div>
          <PublicPrimary href={joinHref}>Join Free</PublicPrimary>
        </div>

        <p className="mt-5 text-[13.5px] text-ink-2">
          Already a member?{" "}
          <Link href={signInHref} className="font-semibold text-magenta-dark hover:underline dark:text-magenta">
            Sign In
          </Link>
        </p>
      </main>
    </div>
  );
}

/** THE STICKY BAR. The brief: *"A thin sticky bar: 'Showing a masked */
export function MaskedPreviewBar({
  joinHref,
  signInHref,
}: {
  joinHref: string;
  signInHref: string;
}) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-center gap-3 border-t border-line bg-white px-4 py-3 text-[14px] sm:px-6 dark:border-white/15 dark:bg-ink">
      <span className="text-ink-2">Showing a masked preview.</span>
      <PublicPrimary href={joinHref}>Join Free to See Full Profiles</PublicPrimary>
      <PublicSecondary href={signInHref}>Sign In</PublicSecondary>
    </div>
  );
}
