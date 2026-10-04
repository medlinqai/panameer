"use client";

import { useEffect, useRef, useState } from "react";
import { employerDisplayName } from "@/lib/employer-display";
import { ProjectCard, dateRange, type EmployerItem, type ProjectItem } from "@/components/profile/sections";
import { ValidatedBadge, ValidationPending } from "@/components/profile/ValidatedBadge";

const HEADING_WORDS = /^(roles?|prior role[- ]types?|role[- ]types?|experience|employment|work history|career( experience)?|positions?)$/i;

function displayRole(title?: string | null): string | null {
  const t = title?.trim();
  if (!t) return null;
  const isShouted = t === t.toUpperCase() && t.split(/\s+/).length <= 3;
  if (isShouted && HEADING_WORDS.test(t.replace(/[^a-z\s-]/gi, "").trim())) return null;
  return t;
}

function Dot() {
  return (
    <span aria-hidden className="text-[13px] text-ink-2/45">
      ·
    </span>
  );
}

export function WorkHistoryEntry({
  employer,
  projects,
  isOwner = false,
  artifactsSlot,
  contactSlot,
  condensed = false,
  roleFirst = false,
}: {
  employer: EmployerItem;
  /** This employer's projects, already filtered by the caller. */
  projects: ProjectItem[];
  isOwner?: boolean;
  /** Role title bold on top, company grey beneath — `/profile` only. */
  roleFirst?: boolean;
  /** WS4 — rendered inside the Artifacts disclosure when present. */
  artifactsSlot?: React.ReactNode;
  /** WS5 — rendered inside the Contact disclosure when present. */
  contactSlot?: React.ReactNode;
  condensed?: boolean;
}) {
  const [open, setOpen] = useState<null | "more" | "projects" | "artifacts" | "contact">(null);

  const toggle = (k: "more" | "projects" | "artifacts" | "contact") =>
    setOpen((cur) => (cur === k ? null : k));

  const range = dateRange(
    employer.startDate ?? null,
    employer.endDate ?? null,
    employer.isCurrent ?? false
  );

  const link =
    "text-[14px] font-bold text-magenta transition-colors hover:text-magenta-dark";
  const linkOff = "text-[14px] font-bold text-ink-2/40 cursor-not-allowed";

  const description = employer.description ?? "";

  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [isLong, setIsLong] = useState(false);
  // Condensed hides the paragraph outright, so the clamp never measures and
  // isLong stays false — Read More would render dead on every entry. Any
  // description at all is "more to read" when none of it is on screen.
  const hasMore = condensed ? Boolean(description) : isLong;

  useEffect(() => {
    const el = textRef.current;
    if (!el || !description) {
      setIsLong(false);
      return;
    }
    const measure = () => {
      // Only meaningful while clamped; once expanded the two heights match.
      if (open === "more") return;
      setIsLong(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [description, open]);

  return (
    <div>
      {}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          {}
          {}
          {}
          {roleFirst && displayRole(employer.roleTitle) ? (
            <>
              <p className="text-[16px] font-semibold">{displayRole(employer.roleTitle)}</p>
              <p className="mt-0.5 text-[14px] text-ink-2">
                {employerDisplayName(employer.name)}
                {employer.validated && (
                  <ValidatedBadge
                    validatedAt={employer.validatedAt ?? null}
                    validatedBy={employer.validatedBy ?? null}
                  />
                )}
                {!employer.validated && isOwner && employer.validationPending && (
                  <ValidationPending />
                )}
              </p>
            </>
          ) : (
            <>
              <p className="font-bold">
                {employerDisplayName(employer.name)}
                {employer.validated && (
                  <ValidatedBadge
                    validatedAt={employer.validatedAt ?? null}
                    validatedBy={employer.validatedBy ?? null}
                  />
                )}
                {!employer.validated && isOwner && employer.validationPending && (
                  <ValidationPending />
                )}
              </p>
              {displayRole(employer.roleTitle) && (
                <p className="mt-0.5 text-[14px] text-ink-2">
                  {displayRole(employer.roleTitle)}
                </p>
              )}
            </>
          )}
        </div>
        {range && <p className="text-[13.5px] text-ink-2">{range}</p>}
      </div>

      {description && (!condensed || open === "more") && (
        <p
          ref={textRef}
          className={
            "mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2 " +
            (open === "more" ? "" : "line-clamp-2")
          }
        >
          {description}
        </p>
      )}

      {}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={() => toggle("more")}
          className={hasMore ? link : linkOff}
          disabled={!hasMore}
          aria-expanded={open === "more"}
        >
          {open === "more" ? "Read Less" : "Read More"}
        </button>

        <Dot />
        <button
          type="button"
          onClick={() => toggle("projects")}
          className={projects.length > 0 ? link : linkOff}
          disabled={projects.length === 0}
          aria-expanded={open === "projects"}
          title={
            projects.length === 0
              ? "No projects recorded for this employer"
              : undefined
          }
        >
          Projects{projects.length > 0 ? ` (${projects.length})` : ""}
        </button>

        <Dot />
        <button
          type="button"
          onClick={() => toggle("artifacts")}
          className={artifactsSlot ? link : linkOff}
          disabled={!artifactsSlot}
          aria-expanded={open === "artifacts"}
          title={artifactsSlot ? undefined : "Nothing attached yet"}
        >
          Artifacts
        </button>

        <Dot />
        <button
          type="button"
          onClick={() => toggle("contact")}
          className={contactSlot ? link : linkOff}
          disabled={!contactSlot}
          aria-expanded={open === "contact"}
          title={contactSlot ? undefined : "No contact on file"}
        >
          Contact
        </button>
      </div>

      {open === "projects" && projects.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {projects.map((pr) => (
            <ProjectCard key={pr.id} p={pr} isOwner={isOwner} />
          ))}
        </div>
      )}

      {open === "artifacts" && artifactsSlot && (
        <div className="mt-4">{artifactsSlot}</div>
      )}

      {open === "contact" && contactSlot && (
        <div className="mt-4">{contactSlot}</div>
      )}
    </div>
  );
}
