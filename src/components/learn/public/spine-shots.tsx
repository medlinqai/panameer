import type { ReactNode } from "react";
import { ShotCard, Check } from "@/components/learn/public/shared";

/* ── shared parts, local to the spine ─────────────────────────────────────── */

/** A row in a card. `last:border-b-0` rather than a prop, so order never has to be tracked. */
function Row({
  dot,
  title,
  meta,
  pill,
  pillTone = "muted",
}: {
  dot: ReactNode;
  title: string;
  meta?: string;
  pill?: string;
  pillTone?: "done" | "now" | "muted";
}) {
  return (
    <div className="flex items-center gap-[11px] border-b border-line py-[11px] last:border-b-0">
      {dot}
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-[1.3] text-ink">{title}</span>
        {meta ? <span className="mt-[2px] block text-[11.5px] text-ink-2">{meta}</span> : null}
      </span>
      {pill ? (
        <span
          className={
            "ml-auto whitespace-nowrap text-[11px] font-semibold " +
            (pillTone === "done"
              ? "text-[#137a51]"
              : pillTone === "now"
                ? "text-magenta-dark"
                : "text-ink-2")
          }
        >
          {pill}
        </span>
      ) : null}
    </div>
  );
}

function DotDone() {
  return (
    <span
      aria-hidden
      className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-magenta text-white"
    >
      <Check />
    </span>
  );
}
function DotNow({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full border-[2.5px] border-magenta font-display text-[11.5px] font-bold leading-none text-magenta-dark"
    >
      {label}
    </span>
  );
}
function DotNext({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-[#efeaf4] font-display text-[11.5px] font-bold leading-none text-[#7b8496]"
    >
      {label}
    </span>
  );
}

function VerifyCode() {
  return (
    <code className="rounded-[6px] bg-[#f4eff8] px-[7px] py-[2px] text-[11px] text-[#6f2b8e]">
      panameer.com/verify/PM-8Q42-KD
    </code>
  );
}

/* ── §3 · ENROLL IN A LEARNING PATH ───────────────────────────────────────── */

export function EnrollShot() {
  return (
    <ShotCard>
      <Row dot={<DotDone />} title="Procure-to-Pay foundations" meta="6 lessons" pill="Enrolled" pillTone="done" />
      <Row dot={<DotDone />} title="Advanced Procurement" meta="105 lessons · 6 courses" pill="Enrolled" pillTone="done" />
      <Row dot={<DotNext label="+" />} title="Contract Management" meta="52 lessons · 3 courses" pill="Add" />
      <Row dot={<DotNext label="+" />} title="Journals" meta="19 lessons · 4 courses" pill="Add" />
      <p className="mt-2 text-[11.5px] text-ink-2">Functional areas · one certificate per path</p>
    </ShotCard>
  );
}

/* ── §4 · TAKE EACH COURSE ────────────────────────────────────────────────── */

export function CourseStepsShot() {
  return (
    <ShotCard>
      <Row dot={<DotDone />} title="1 · Course Overview" meta="4 lessons" pill="Done" pillTone="done" />
      <Row dot={<DotNow label="2" />} title="2 · Create New" meta="9 lessons" pill="In progress" pillTone="now" />
      <Row dot={<DotNext label="3" />} title="3 · Find Existing" meta="7 lessons" pill="Next" />
      <Row dot={<DotNext label="4" />} title="4 · Change Existing" meta="6 lessons" pill="—" />
      <div className="mt-3.5">
        <div aria-hidden className="h-[6px] overflow-hidden rounded-full bg-[#efeaf4]">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,#d72cd6,#8b2fd0)]"
            style={{ width: "58%" }}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-ink-2">58% complete · Basic Procurement › Requisitions</p>
      </div>
    </ShotCard>
  );
}

/* ── §5 · WATCH EACH LESSON ───────────────────────────────────────────────── */

const CHAPTERS = [
  { at: "0:00", what: "What a requisition is" },
  { at: "1:52", what: "Creating one from a catalog item" },
  { at: "4:10", what: "Submitting for approval" },
] as const;

export function LessonShot() {
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[14px] border border-line bg-[#150e22]">
        <span className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/20 bg-[rgba(20,12,32,0.72)] py-[5px] pl-[5px] pr-[11px]">
          <span
            aria-hidden
            className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[linear-gradient(135deg,#d72cd6,#7b2fd0)] font-display text-[11px] font-bold leading-none text-white"
          >
            SW
          </span>
          <span className="text-[11.5px] font-semibold text-white">Scott Walls</span>
        </span>
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="grid h-[56px] w-[56px] place-items-center rounded-full bg-white/90">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#17131f" aria-hidden focusable="false">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-0 block bg-[linear-gradient(transparent,rgba(0,0,0,0.75))] px-3.5 py-[11px] text-[12.5px] text-white">
          2.3 — How to Create a Requisition · 6:41
        </span>
      </div>
      <ul className="mt-3 list-none p-0">
        {CHAPTERS.map((c) => (
          <li key={c.at} className="flex gap-[9px] py-1.5 text-[12.5px] text-ink-2">
            <span className="min-w-[34px] font-semibold tabular-nums text-magenta-dark">{c.at}</span>
            <span>{c.what}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── §6 · GET CERTIFIED ───────────────────────────────────────────────────── */

export function PathCertificateShot() {
  return (
    <div className="rounded-[16px] border border-line bg-[linear-gradient(135deg,#ffffff_0%,#fdf4fd_100%)] p-[22px] text-center">
      <span
        aria-hidden
        className="mx-auto mb-3 grid h-[58px] w-[58px] place-items-center rounded-full bg-[linear-gradient(135deg,#d72cd6,#7b2fd0)] text-white"
      >
        <Check className="h-[26px] w-[26px]" />
      </span>
      <p className="font-display text-[19px] font-bold leading-[1.2] text-ink">Basic Procurement</p>
      <p className="mt-1 text-[13px] text-ink-2">Issued to Paul Ingrao · Panameer Learn</p>
      <p className="mt-3.5 border-t border-dashed border-line pt-3 text-[11.5px] text-ink-2">
        Verify at <VerifyCode />
      </p>
    </div>
  );
}

/* ── §7 · WHILE YOU ARE LEARNING ──────────────────────────────────────────── */

const INSTRUCTORS = [
  { initials: "SW", name: "Scott Walls", meta: "338 lessons · Advanced Procurement", grad: "#d72cd6,#7b2fd0" },
  { initials: "LE", name: "Linus Erley", meta: "70 lessons · Inventory Management", grad: "#2f7bd0,#2fb8d0" },
  { initials: "MS", name: "Marelise Steenkamp", meta: "33 lessons · Core HR", grad: "#d0742f,#d0a72f" },
] as const;

export function InstructorsShot() {
  return (
    <ShotCard>
      <div className="flex flex-wrap gap-3">
        {INSTRUCTORS.map((p) => (
          <span
            key={p.initials}
            className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3.5"
          >
            <span
              aria-hidden
              style={{ backgroundImage: `linear-gradient(135deg,${p.grad})` }}
              className="grid h-[32px] w-[32px] flex-none place-items-center rounded-full font-display text-[12px] font-bold leading-none text-white"
            >
              {p.initials}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink">{p.name}</span>
              <span className="block text-[11px] text-ink-2">{p.meta}</span>
            </span>
          </span>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-ink-2">
        Almost every lesson names the person who recorded it.
      </p>
    </ShotCard>
  );
}

/* ── §8 · WHAT DO YOU DO AFTER THE TRAINING ───────────────────────────────── */

/**
 * ⚠ `LinkedIn` HERE IS SCOTT'S OWN WORD AND IS NOT THE REMOVED OAUTH PROVIDER. LinkedIn was
 * removed everywhere as an identity provider and as a profile field; "a URL you can paste into
 * LinkedIn" is a place a learner puts a link, which is what he asked for verbatim.
 *
 * ⚠ `P1-J3-E019` IS FIXED, AND THIS NOTE USED TO SAY THE OPPOSITE. It recorded that the issuer
 * opened `if (!profile || !path) return null` and that `Certification.provider_profile_id` was
 * not nullable, so a learner without a seller profile passed the test and got nothing,
 * silently. As of 2026-08-21 `Certification.user_id` is the owner, the profile link is
 * nullable, and only the path is required. ⚠ THE CARD'S CLAIM IS TRUE FOR EVERYONE NOW.
 *
 * ⚠ §8's COPY IS STILL UNCHANGED, deliberately — `P1-J0-E282`/`E283` are separate rows and
 * still need Scott. The schema stopped lying; the sentence is his to widen.
 */
export function ProfileCertificatesShot() {
  return (
    <ShotCard>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-[44px] w-[44px] flex-none place-items-center rounded-full bg-[linear-gradient(135deg,#d72cd6,#7b2fd0)] font-display text-[15px] font-bold leading-none text-white"
        >
          PI
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-ink">Paul Ingrao</span>
          <span className="block text-[11.5px] text-ink-2">Oracle Procurement · Austin, TX</span>
        </span>
      </div>
      <div className="mt-3.5">
        <Row dot={<DotDone />} title="Basic Procurement" meta="Panameer Learn · verified" pill="Live" pillTone="done" />
        <Row dot={<DotDone />} title="Contract Management" meta="Panameer Learn · verified" pill="Live" pillTone="done" />
      </div>
      <p className="mt-3 text-[11.5px] leading-[1.5] text-ink-2">
        Shareable: <VerifyCode /> — works on LinkedIn or a résumé.
      </p>
    </ShotCard>
  );
}
