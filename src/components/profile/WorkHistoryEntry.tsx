"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectCard, dateRange, type EmployerItem, type ProjectItem } from "@/components/profile/sections";

/**
 * One Work-History entry — PJv2 WS3, matching "Profile Review Mock up" pg1.
 *
 * Shape per the mockup: `Employer · Role Title` on the left with the date range
 * right-aligned, the description beneath, then a row of four evenly-spaced
 * magenta links:
 *
 *   Read More · Projects · Artifacts · Contact
 *
 * All four are DISCLOSURES, not navigations. `Projects` expands this employer's
 * project cards in place rather than jumping to a Projects section, because
 * after E074 the only projects section on the page is **Solo Projects** — which
 * by definition holds the ones with no employer. A `#project-<id>` jump would
 * therefore land on nothing for exactly the projects this link is about. The
 * cards still carry their `#project-<id>` ids, so any external anchor into a
 * project keeps resolving.
 *
 * Artifacts (WS4) and Contact (WS5) render only when there is something behind
 * them; a link that opens an empty panel is worse than an absent one.
 */
/*
  A résumé SECTION HEADING is not a job title (WS4 / E145).

  The heuristic parser splits on headings, and where a heading sat alone above
  the entries it became the entry itself — the profile then rendered
  "(Employer not detected) · ROLES", and also "· PRIOR ROLE-TYPES". Those are
  shouted section labels, not something anyone did for a living.

  Suppressed at RENDER rather than only fixed in the parser, because the bad
  rows are already in the database: a parser fix helps the next import and does
  nothing for a profile that was imported last week. Deliberately narrow — an
  all-caps title of three words or fewer that is one of the known headings —
  so a real title like "CTO" or "VP SALES" is untouched.
*/
const HEADING_WORDS = /^(roles?|prior role[- ]types?|role[- ]types?|experience|employment|work history|career( experience)?|positions?)$/i;

function displayRole(title?: string | null): string | null {
  const t = title?.trim();
  if (!t) return null;
  const isShouted = t === t.toUpperCase() && t.split(/\s+/).length <= 3;
  if (isShouted && HEADING_WORDS.test(t.replace(/[^a-z\s-]/gi, "").trim())) return null;
  return t;
}

/** The separator between the action links (E089). */
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
}: {
  employer: EmployerItem;
  /** This employer's projects, already filtered by the caller. */
  projects: ProjectItem[];
  isOwner?: boolean;
  /** WS4 — rendered inside the Artifacts disclosure when present. */
  artifactsSlot?: React.ReactNode;
  /** WS5 — rendered inside the Contact disclosure when present. */
  contactSlot?: React.ReactNode;
  /**
   * CONDENSED — one tight line per role (brief_provider_home_page_v2 WS1/E146).
   *
   * The "You're live" page has to fit on ONE screen so it reads as "here's your
   * live profile" rather than an endless scroll. A provider with seven roles,
   * each carrying two clamped lines of description, is already three screens
   * before the sections below it. So the description is withheld entirely here
   * and Read More becomes the way to get it — the affordance the mockup already
   * shows, now doing real work instead of expanding text that was half-visible
   * anyway.
   */
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

  /*
    E119 — "Read More" was greyed out on entries that plainly had more to read.
    The test was `description.length > 180`, a guess at what 180 characters looks
    like — but the clamp is `line-clamp-2`, and how much fits in two lines depends
    on the card's width and where the words break. A 150-character description in
    a narrow column is clamped and got a dead link; a 200-character one in a wide
    column isn't clamped and got a live link that did nothing visible.

    So ask the DOM instead of guessing: the text is truncated exactly when its
    scroll height exceeds its client height. Re-measured on resize, because the
    same entry can be clamped at one width and not at another.
  */
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          {employer.name}
          {displayRole(employer.roleTitle) ? ` · ${displayRole(employer.roleTitle)}` : ""}
        </p>
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

      {/*
        E089 — a TIGHT left-aligned cluster with middot separators, not a
        four-column grid justified across the card. Justified, the links stranded
        apart with dead gaps between them and read as an empty table row; grouped,
        they read as what they are — a set of disclosures belonging to the entry
        above them. Disabled ones stay greyed in place rather than disappearing,
        so the row doesn't reflow between entries.
      */}
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
            projects.length === 0 ? "No projects recorded for this role" : undefined
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
