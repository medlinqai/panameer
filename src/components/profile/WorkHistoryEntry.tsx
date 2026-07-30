"use client";

import { useState } from "react";
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
export function WorkHistoryEntry({
  employer,
  projects,
  isOwner = false,
  artifactsSlot,
  contactSlot,
}: {
  employer: EmployerItem;
  /** This employer's projects, already filtered by the caller. */
  projects: ProjectItem[];
  isOwner?: boolean;
  /** WS4 — rendered inside the Artifacts disclosure when present. */
  artifactsSlot?: React.ReactNode;
  /** WS5 — rendered inside the Contact disclosure when present. */
  contactSlot?: React.ReactNode;
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
  // "Read More" only earns its place when there is more to read.
  const isLong = description.length > 180;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          {employer.name}
          {employer.roleTitle ? ` · ${employer.roleTitle}` : ""}
        </p>
        {range && <p className="text-[13.5px] text-ink-2">{range}</p>}
      </div>

      {description && (
        <p
          className={
            "mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2 " +
            (open === "more" || !isLong ? "" : "line-clamp-2")
          }
        >
          {description}
        </p>
      )}

      {/* The four-link row, evenly spaced as in the mockup. */}
      <div className="mt-3 grid grid-cols-2 gap-y-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => toggle("more")}
          className={isLong ? link : linkOff}
          disabled={!isLong}
          aria-expanded={open === "more"}
        >
          {open === "more" ? "Read Less" : "Read More"}
        </button>

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
