import Link from "next/link";
import type { ReactNode } from "react";

/**
 * ── ⚠⚠⚠ THE BOXLESS SECTION (`P2-A2-E713` WS-A, `brief_clean_page`) ──────────
 *
 * ⚠⚠ **SCOTT, 2026-09-26, ON THE MOCKUP HE APPROVED:** *"MUCH better."* · *"The cards are
 * not obvious, bordered."* · *"No grey background… boxes cut up the page."* · *"I definitely
 * like the section expanders."*
 * ⚠ **SO A SECTION IS: a thin top rule, a title, an optional right-hand action, a chevron,
 * and white.** No border, no background, no shadow, no radius.
 *
 * ── ⚠⚠⚠ WHY THIS IS A NEW FILE AND NOT AN EDIT TO `ProfileCard` ─────────────
 *
 * ⚠⚠ **`ProfileCard` AND ITS `CARD` CONSTANT ARE SHARED WITH `/join/provider`, WHICH MUST
 * LOOK EXACTLY AS IT DOES NOW** (premise 2, and the brief says it twice). ⚠⚠⚠ **SO THE BOX
 * LEAVES BY A NEW COMPONENT — NEVER BY EDITING `CARD`.** Editing `CARD` would silently
 * restyle the onboarding review, which is the one page this brief is forbidden to touch.
 * ⚠ `ProfileCard` is **not** deleted and **not** changed: `/join/provider` keeps it, and
 * `E585`'s rule is satisfied because the two components describe two different surfaces
 * rather than one surface twice.
 *
 * ── ⚠⚠ IT IS A REAL `<details>`, NOT A `useState` TOGGLE ────────────────────
 *
 * ⚠⚠⚠ **SO IT FOLDS WITH JAVASCRIPT OFF, IT IS KEYBOARD-OPERABLE WITHOUT A SINGLE
 * `onKeyDown`, AND A SCREEN READER ANNOUNCES ITS EXPANDED STATE WITHOUT AN `aria-expanded`
 * ANYBODY HAS TO REMEMBER TO UPDATE.** ⚠ A hand-rolled toggle would need all three and
 * would be the component that drifts.
 * ⚠ **AND IT LETS THIS FILE STAY A SERVER COMPONENT** — no `"use client"`, so the profile
 * does not ship a bundle to fold a heading.
 * ⚠⚠ `open` defaults to **true**: the brief says *"Open by default."* A section that hides
 * a member's own record until they click is the boxes problem in a new form.
 *
 * ── ⚠⚠⚠ THE ACTION IS **NOT** INSIDE THE `<summary>`, AND THE MOCKUP IS WRONG ABOUT THIS
 *
 * ⚠⚠ **THE APPROVED MOCKUP PUTS `Edit` INSIDE `<summary>`** (`<summary>…<a class="ed">`).
 * ⚠⚠⚠ **THAT BREAKS A STANDING RULING WITH A GATE BEHIND IT.** `StepDisclosures` decision 4:
 * *"NO INTERACTIVE DESCENDANT OF THE SUMMARY. A `<button>` inside a `<summary>` is `E097`
 * wearing a different tag — the summary IS the interactive element, and a control inside it
 * eats the Enter that opens the panel. `check:ui` §12 already forbids it."*
 * ⚠ **AND IT IS A REAL BUG, NOT A TECHNICALITY: clicking `Edit` would ALSO fold the section**,
 * and keyboard `Enter` on the link would fight the disclosure.
 *
 * ⚠⚠ **SO THE LOOK IS KEPT AND THE MARKUP IS NOT.** `<summary>` stays the first child of
 * `<details>` (native behaviour requires that) and holds only the title and the chevron; the
 * action is a **SIBLING**, painted onto the header row absolutely.
 * ⚠ `right-[34px]` is the chevron's 16px plus the 18px gap, so the action lands exactly where
 * the mockup draws it. ⚠⚠ `top-[22px]` matches `summary`'s own `py-[22px]`.
 * ⚠⚠⚠ **REPORTED TO SCOTT RATHER THAN SILENTLY DIVERGING** — the pixels match his mockup,
 * the DOM does not, and the reason is his own ruling.
 */
export function CleanSection({
  title,
  action,
  id,
  open = true,
  /** A quiet right-hand fact — a count — where there is no action. */
  note,
  /**
   * ── ⚠⚠⚠ THE EMPTY-SECTION RULE (`P2-A2-E713` WS-A item 5) ──────────────────
   *
   * ⚠ **SCOTT: *"An empty section: the owner sees one plain line with an action. A visitor
   * does not see the section at all."***
   * ⚠⚠ **SO EMPTINESS IS DECIDED BY THE CALLER — it knows what its own data is — AND THE
   * CONSEQUENCE IS DECIDED HERE, ONCE.** Eleven call sites each writing their own
   * `{!owner && empty ? null : …}` is eleven chances to get the visitor case wrong, and the
   * one that is wrong is the one a buyer sees.
   * ⚠⚠⚠ **IT FAILS CLOSED FOR THE VISITOR:** `isEmpty` with no `showWhenEmpty` renders
   * NOTHING. A section only survives emptiness by someone explicitly saying the owner is
   * looking.
   */
  isEmpty = false,
  showWhenEmpty = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  id?: string;
  open?: boolean;
  note?: string;
  isEmpty?: boolean;
  showWhenEmpty?: boolean;
  children: ReactNode;
}) {
  /*
    ⚠⚠ A VISITOR IS SHOWN NOTHING RATHER THAN AN EMPTY HEADING. ⚠⚠⚠ An empty section on a
    buyer-facing profile is the defect `E562` spent a whole brief removing — a page that
    states its absences instead of its strengths.
  */
  if (isEmpty && !showWhenEmpty) return null;
  return (
    /*
      ── ⚠⚠⚠ THE ACTION MOVES OUTSIDE `<details>` (`P2-A2-E718` item 4) ──────────────────

      ⚠ **SCOTT, ON HIS PHONE: Languages was closed and showed NO `Edit`.**
      ⚠⚠⚠ **A CLOSED `<details>` RENDERS ONLY ITS `<summary>`.** The action was a SIBLING of
      the summary *inside* `<details>` — correct for `E097`, and invisible the moment the
      section was closed. ⚠ Absolute positioning did not save it: the element is still a
      child of a collapsed disclosure, and the browser never lays it out at all.
      ⚠⚠ **THIS IS A REGRESSION `E716` INTRODUCED AND I OWN IT.** Before that brief every
      section loaded OPEN, so the action was always rendered; `E716` closed five of them at
      Scott's instruction and took their `Edit` controls with them — **on exactly the five
      sections an owner is most likely to want to edit.**
      ⚠⚠⚠ **NO GATE CAUGHT IT, AND THE REASON IS WORTH WRITING DOWN:** `check:profile-edit`
      asserts every `Edit` control's DESTINATION renders, and the section-state gate asserts
      which sections are open. **Neither asks whether the control is VISIBLE in the state the
      page loads in** — two green gates, one invisible control.
      ⚠ **THE FIX IS A WRAPPER, NOT A MOVE INTO `<summary>`:** putting the action inside the
      summary is `E097` (no interactive descendant of a summary) and `check:ui` §12 forbids
      it. The wrapper is the positioning context instead, so the action is a sibling of
      `<details>` and renders in both states.
      ⚠ `relative` stays on `<details>` too — the chevron positions against it, and both boxes
      are the same rectangle, so neither moves.
    */
    <div className="relative">
    <details
      id={id}
      open={open}
      /*
        ⚠⚠ `border-t` ONLY, AND THE LAST ONE GETS A BOTTOM RULE FROM THE PARENT. A
        `border-b` on every section would double every internal rule into 2px.
        ⚠ `scroll-mt-24` is kept from `ProfileCard`: the What's-Missing links scroll to a
        section by id and must not land under the pinned band.
      */
      className="pm-clean-sec relative scroll-mt-24 border-t border-line"
    >
      <summary
        /*
          ⚠⚠⚠ `list-none` PLUS THE WEBKIT PSEUDO-ELEMENT. Removing only one of them leaves
          the native triangle visible in one engine — the defect is invisible on the
          machine you built it on, which is why both are here.
          ⚠⚠ `pr-24` reserves the lane the absolutely-positioned action sits in, so a long
          title cannot run underneath it.
        */
        className="flex cursor-pointer list-none items-center gap-4 py-[22px] pr-24 [&::-webkit-details-marker]:hidden"
      >
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
        {/*
          ⚠⚠ THE CHEVRON IS DECORATION AND IS `aria-hidden` — `StepDisclosures` decision 3:
          *"the summary already announces its own expanded state; a second announcement from
          an icon is noise."*
          ⚠⚠⚠ IT ROTATES IN PLAIN CSS VIA `details[open]`, NOT WITH A TAILWIND VARIANT.
          `group-open:` is used NOWHERE in this codebase, and a Tailwind class that does not
          exist **emits no CSS and fails silently** (the `HERO_SCRIM` trap). The working
          precedent is `step-disclosures.css:96`, and this follows it.
        */}
        {/*
          ── ⚠⚠⚠ THE CHEVRON IS PINNED TO THE RIGHT EDGE, AND THE ACTION SITS TO ITS LEFT
              (`P2-A2-E715` row 7) ──────────────────────────────────────────────────────

          ⚠ **SCOTT'S MOCKUP READS `Edit ⌄`. `E713` SHIPPED `⌄ Edit`** — the action was
          absolute at `right-[34px]` while the chevron was a `justify-between` flex child
          sitting at the content edge, 96px in behind `pr-24`, **so the chevron landed to the
          LEFT of the action and the pair was inverted.**
          ⚠⚠ MEASURED AT THE `before` GATE, not assumed: chevron at x≈1143, `Edit` at x≈1200.
          ⚠⚠⚠ **FIXING IT BY MOVING THE ACTION FURTHER RIGHT WOULD PUSH IT OFF THE RULE** —
          the chevron is what marks the section's right edge, so the chevron is what gets
          pinned and the action is placed relative to it.
          ⚠ It stays INSIDE `<summary>` so a click on it still toggles the section; it is
          `aria-hidden` decoration either way (`StepDisclosures` decision 3).
        */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pm-clean-chev absolute right-0 top-[24px] h-4 w-4 shrink-0 stroke-ink-2"
          fill="none"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-7">{children}</div>
    </details>
      {/*
        ⚠⚠⚠ OUTSIDE `<details>`, NOT INSIDE IT — see the block at the top of this return.
        ⚠ Still not a descendant of `<summary>`, which is what keeps `Edit` from eating the
        Enter that opens the panel (`E097`, `check:ui` §12).
        ⚠ `right-[34px]` is the chevron's 16px plus the mockup's 18px gap, so the action lands
        immediately to its left; `top-[23px]` matches the summary's own `py-[22px]`.
      */}
      {(action || note) && (
        <div className="absolute right-[34px] top-[23px] flex items-center gap-[18px]">
          {note && <span className="text-[13px] text-ink-2">{note}</span>}
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * ── ⚠⚠ THE PLAIN `Edit` (`P2-A2-E713` WS-A item 3) ─────────────────────────
 *
 * ⚠ **SCOTT: the ✏️ emoji goes.** ⚠⚠ A NEW component rather than `icon=""` on `EditLink`,
 * for the same reason `CleanSection` is new: `EditLink`'s default is `"✏️"` and
 * `/join/provider` depends on it. ⚠⚠⚠ Changing that default would take the pencil off a
 * page this brief may not touch.
 * ⚠ **`aria-label` NAMES THE THING BEING EDITED** — carried over from `EditLink`, because
 * a dozen identical *"Edit"* links on one page are indistinguishable to a screen reader,
 * and that reason did not change when the emoji left.
 */
export function CleanEdit({
  href,
  title,
  label = "Edit",
}: {
  href: string;
  title: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label} ${title}`}
      className="text-[12px] font-semibold text-magenta-dark hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * ── ⚠⚠ THE THIN CHIP (`P2-A2-E713` WS-A item 4) ────────────────────────────
 *
 * ⚠ **Scott: *"thinner chips: 1px outline, small type"*.** ⚠⚠ Still magenta — **ruling
 * `31e` is unchanged and this does not reopen it.**
 * ⚠⚠⚠ **THE OUTLINE IS AN INSET `box-shadow`, NOT A `border`, AND THAT IS THE MOCKUP'S OWN
 * CHOICE:** a border adds 2px to the chip's box and shifts every neighbour, so a row of
 * chips reflows the moment the outline changes weight. An inset shadow paints inside the
 * same box. ⚠ Tailwind's arbitrary `shadow-[inset_0_0_0_1px_…]` is the direct translation.
 */
export const CLEAN_CHIP =
  "rounded-full px-3 py-1 text-[12px] font-medium text-magenta-dark shadow-[inset_0_0_0_1px_var(--color-magenta)]";

/**
 * ⚠⚠ THE CLASS IS EXPORTED SEPARATELY BECAUSE `SkillsBody` TAKES A CLASS, NOT A COMPONENT.
 * ⚠ One string, two consumers (`E585`): this component for markup that draws its own chips,
 * and `chipClass` for the shared body that already has a `<span>` of its own.
 */
export function CleanChip({ children }: { children: ReactNode }) {
  return <span className={CLEAN_CHIP}>{children}</span>;
}

/**
 * ⚠⚠ A FLAT LEFT-COLUMN BLOCK (WS-A item 9) — Rates, Visibility, Rank Higher.
 *
 * ⚠ **Scott: those four *"lose their boxes too, and are separated by thin lines."***
 * ⚠⚠ The heading is a 12px uppercase eyebrow, and it carries its own optional `Edit` on
 * the right — the mockup's `.side h4` with `justify-content: space-between`.
 */
export function CleanSide({
  title,
  titleHref,
  action,
  children,
}: {
  title: string;
  /**
   * ── ⚠⚠ AN OPTIONAL DOOR ON THE LABEL (`P2-A2-E716`) ──────────────────────────
   *
   * ⚠ **SCOTT: the `SEARCH SCORE` label becomes a link to the Score tab.** ⚠⚠ **THE
   * SMALL-CAPS TREATMENT IS KEPT AND THAT IS EXPLICIT IN THE INSTRUCTION** — it stays a
   * 12px uppercase eyebrow and becomes magenta-ink, the colour `CleanEdit` already uses, so
   * every link in this column says *"link"* the same way (`E433`).
   * ⚠⚠⚠ **OPTIONAL, SO `Rates` IS UNTOUCHED.** `CleanSide` renders the Rates block too, and
   * its label is not a door — it has an `Edit` control instead. A required href would have
   * forced a destination on a block that does not want one.
   */
  titleHref?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const label = "text-[12px] font-semibold uppercase tracking-[0.08em]";
  return (
    /* ⚠ `pm-side` is the stable hook the phone layout needs: inside `pm-rail-top` the
       top rule and the 28px margin are suppressed, because there the block sits BESIDE
       the photo rather than under a divider (`E718` item 1). */
    <div className="pm-side mt-7 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        {titleHref ? (
          /* ⚠ `<h4>` WRAPS THE LINK RATHER THAN THE LINK WRAPPING THE HEADING: the block still
             has a heading in the outline when the link is ignored, and a screen reader
             announces a link inside a heading rather than a heading that happens to be one. */
          <h4 className={label}>
            <Link href={titleHref} className="text-magenta-dark hover:underline">
              {title}
            </Link>
          </h4>
        ) : (
          <h4 className={`${label} text-ink-2`}>{title}</h4>
        )}
        {action}
      </div>
      {children}
    </div>
  );
}
