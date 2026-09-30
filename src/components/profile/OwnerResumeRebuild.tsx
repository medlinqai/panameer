"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";
import {
  ResumeUploadModal,
  type ImportOutcome,
} from "@/components/onboarding/ResumeUploadModal";

/**
 * ── ⚠⚠⚠ `Rebuild From New Résumé` (`P2-A2-E720` item 9) ──────────────────────────────────
 *
 * ⚠ **SCOTT: *"a magenta text link under How Others See My Profile, starting with an upload
 * (reuse the onboarding uploader; offer 'Use the one on file' as a second choice), then the
 * existing preview → ticked diff → save. Greyed with one line of reason if AI is
 * unavailable."***
 *
 * ── ⚠⚠⚠ WHY SCOTT COULD NOT SEE THE OLD CONTROL — MEASURED, NOT GUESSED ──────────────────
 *
 * ⚠ He asked what hides `OwnerResumeRerun`. It is **`ResumeImportAction`'s line 95**:
 * `if (!info?.available || !info.hasDocument) return null;` — two gates, and **only the second
 * one bites**.
 * ⚠⚠ **MEASURED ON HIS OWN ROW: `RESUME_PARSER_API_KEY`, `RESUME_PARSER_MODEL` AND
 * `ANTHROPIC_API_KEY` ARE ALL PRESENT, SO `available` IS TRUE** — the AI gate was never the
 * problem. **His profile `74c0df8a` has `ProfileImport` rows = 0**, so `hasDocument` is false
 * and the component returns `null` before it renders anything.
 * ⚠⚠⚠ **AND IT IS NOT PERSONAL TO HIM: 59 OF 63 PROVIDER PROFILES HAVE NO STORED DOCUMENT.**
 * Only 4 do, and those 4 are `E546`'s acceptance uploads. **So the re-run offer has been
 * invisible to 94% of providers for as long as it has existed** — which is exactly why Scott's
 * instruction starts with an upload rather than with the stored file.
 *
 * ── ⚠⚠⚠ THE ONE PLACE THIS DIVERGES FROM THE BRIEF, AND IT IS REPORTED NOT PAPERED OVER ───
 *
 * ⚠⚠⚠ **THE BRIEF'S SEQUENCE IS *"upload → preview → ticked diff → save"*. THE UPLOAD ROUTE
 * DOES NOT WORK THAT WAY: `POST /api/onboarding/provider/import` PARSES **AND APPLIES** IN ONE
 * CALL** — `importProfileDocument` has no store-only mode, and the route's own comment
 * describes its tail as *"applying every employer and project, both recomputes"*. Its
 * `ImportOutcome.applied` counts are written rows, not a proposal.
 * ⚠⚠ **SO ON THE UPLOAD BRANCH THE FIRST PASS IS APPLIED BEFORE ANY TICK, AND THE COPY BELOW
 * SAYS SO IN PLAIN WORDS RATHER THAN IMPLYING AN APPROVAL THAT DID NOT HAPPEN.** `E561` WS-B
 * is the precedent: a promise the code does not keep must not ship as copy.
 * ⚠ **WHAT MAKES IT SAFE ANYWAY, AND IT IS THE EXISTING RULE, NOT A NEW ONE:** the writer is
 * ADDITIVE — `headline` and `overview` are fill-only-when-empty, and skills use
 * `skipDuplicates`, so a hand-edited field is never overwritten. **The upload adds; it does not
 * replace.**
 * ⚠⚠⚠ **CLOSING THE GAP PROPERLY NEEDS A `store-only` MODE ON THAT SHARED ROUTE, WHICH IS THE
 * WIZARD'S CRITICAL PATH — SCOTT'S CALL, NOT A CHANGE TO MAKE INSIDE A CLEANUP ITEM.** Until
 * then the **`Use the one on file`** branch is the one that honours the full
 * propose-then-approve flow, and after an upload that branch becomes available for a second
 * pass — which is why the panel is offered immediately afterwards.
 */

type Info = {
  available: boolean;
  hasDocument: boolean;
  documentName: string | null;
};

export function OwnerResumeRebuild() {
  const router = useRouter();
  const [info, setInfo] = useState<Info | null>(null);
  /** `link` → the text link · `choose` → the two sources · `panel` → preview/diff/save. */
  const [stage, setStage] = useState<"link" | "choose" | "panel">("link");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/resume-ai/available")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setInfo(d))
      /* ⚠⚠ A FAILED PROBE IS NOT "AVAILABLE". ⚠ Defaulting to available on a network error
         would offer a control that can only 503, which is the defect the `available` endpoint
         was built to avoid in the first place. */
      .catch(() => live && setInfo({ available: false, hasDocument: false, documentName: null }));
    return () => {
      live = false;
    };
  }, []);

  /* ⚠ NOTHING UNTIL THE ANSWER ARRIVES — a link that greys itself a moment after painting is
     worse than one that appears a moment late. */
  if (!info) return null;

  /*
    ── ⚠⚠ GREYED, WITH ONE LINE OF REASON (Scott's words) ────────────────────────────────

    ⚠⚠⚠ **IT IS NOT HIDDEN, AND THAT IS THE WHOLE POINT OF THE ITEM.** The old component
    returned `null`, so a provider had no way to tell "this feature is off here" from "this
    feature does not exist" — and Scott spent a brief asking which. ⚠ A disabled control with a
    reason answers the question the absent one could not.
  */
  if (!info.available) {
    return (
      <div className="mt-3">
        <span
          aria-disabled="true"
          className="cursor-not-allowed text-[13px] font-bold text-ink-3"
        >
          Rebuild From New Résumé
        </span>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
          {/* ⚠⚠ THE REASON, NOT AN APOLOGY, AND NO ROADMAP (ruling 18). ⚠⚠⚠ IT NAMES NO
              ENVIRONMENT VARIABLE: this string is read by members, and the availability
              endpoint deliberately returns a BOOLEAN so no key or detail can leak to it. */}
          Résumé reading is unavailable here right now.
        </p>
      </div>
    );
  }

  if (stage === "panel") {
    return (
      <div className="mt-3">
        {/* ⚠ THE EXISTING FLOW, UNCHANGED: confirm → PREVIEW (writes nothing) → a ticked diff
            → apply only what was ticked → a receipt of what was written. ⚠⚠ NOT
            RE-IMPLEMENTED HERE — `E585`, and `E561` WS-B paid for that flow once already. */}
        <ResumeImportAction
          label="Read it again"
          showContext
          onApplied={() => router.refresh()}
        />
      </div>
    );
  }

  if (stage === "choose") {
    return (
      <div className="mt-3 rounded-brand border border-line bg-white p-3.5">
        <p className="text-[13px] font-bold text-ink">Rebuild from a résumé</p>
        <div className="mt-2.5 flex flex-col items-start gap-2">
          {/* ⚠⚠ THE UPLOAD IS FIRST BECAUSE SCOTT PUT IT FIRST, and because 59 of 63 profiles
              have nothing on file — for them it is the only door. */}
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-full border border-ink px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-black/[0.04]"
          >
            Upload a New Résumé
          </button>
          {/*
            ⚠⚠⚠ SAID BEFORE THE CLICK, NOT AFTER. The upload route applies its first pass as it
            reads (see this file's header), so the member is told that here rather than
            discovering it in a receipt. ⚠ "adds" and never "replaces" — that is the writer's
            actual behaviour, not a reassurance.
          */}
          <p className="text-[12px] leading-relaxed text-ink-2">
            Reading a new file adds what it finds to your profile. It never replaces
            anything you typed yourself.
          </p>
          {info.hasDocument && (
            <>
              {/* ⚠ THE SECOND CHOICE, AS SCOTT ORDERED IT. ⚠⚠ Only offered when a document
                  actually exists — otherwise it is a button that can only return nothing. */}
              <button
                type="button"
                onClick={() => setStage("panel")}
                className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
              >
                Use the one on file
                {info.documentName ? ` (${info.documentName})` : ""}
              </button>
              <p className="text-[12px] leading-relaxed text-ink-2">
                Shows you every change and saves only what you tick.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setStage("link")}
            className="font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
        <ResumeUploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onImported={(outcome: ImportOutcome) => {
            setUploadOpen(false);
            if (outcome.status === "FAILED") {
              /* ⚠⚠ A FAILED READ IS REPORTED, NEVER SWALLOWED. `E516` records five blocks in
                 this codebase where a failure produced silence. */
              setError(
                outcome.error ??
                  "We couldn’t read that file. Try a different one."
              );
              return;
            }
            /* ⚠ THE DOCUMENT IS NOW ON FILE, so the propose-then-approve panel can run
               against it for a second pass — which is the closest this can get to the
               brief's sequence without changing the shared import route. */
            setError(null);
            setReceipt("Read. Your profile has been updated.");
            setStage("panel");
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* ⚠⚠ A MAGENTA TEXT LINK, WHICH IS SCOTT'S WORD FOR IT — and `E433`'s rule working as
          intended: magenta is the link affordance, and the ink button above it is the
          page's primary. A second solid button here would claim a second primary. */}
      <button
        type="button"
        data-e720-rebuild
        onClick={() => setStage("choose")}
        className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
      >
        Rebuild From New Résumé
      </button>
      {receipt && (
        <p className="mt-1 text-[12px] font-semibold text-emerald-700">✓ {receipt}</p>
      )}
    </div>
  );
}
