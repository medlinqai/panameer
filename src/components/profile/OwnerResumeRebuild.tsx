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
 * ── ⚠⚠⚠ THE DIVERGENCE `E720` REPORTED IS CLOSED (`P2-A3-E721` item 2) ───────────
 *
 * ⚠ **SCOTT AUTHORISED THE STORE-ONLY MODE, AND BOTH BRANCHES NOW BEHAVE THE SAME WAY:**
 * upload → preview → ticked diff → save, and *"Use the one on file"* → the same.
 * ⚠⚠ **THE UPLOAD NOW WRITES NOTHING TO THE PROFILE.** It stores the document and parses it;
 * `apply: false` skips `applyParsedResume`, `recomputeCompleteness` and — the one that
 * matters — `recomputeProviderRollup`, which `E553` measured as capable of **deleting 297
 * `DERIVED` skill rows across 51 profiles, 139 of them unrecoverable.**
 * ⚠⚠⚠ **SO THE RECEIPT NO LONGER SAYS THE PROFILE WAS UPDATED, BECAUSE IT WAS NOT.**
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this said while the gap was open:
 * //   THE BRIEF'S SEQUENCE IS "upload -> preview -> ticked diff -> save". THE UPLOAD ROUTE
 * //   DOES NOT WORK THAT WAY: POST /api/onboarding/provider/import PARSES AND APPLIES IN ONE
 * //   CALL - importProfileDocument has no store-only mode. So on the upload branch the first
 * //   pass is applied before any tick, and the copy below says so in plain words rather than
 * //   implying an approval that did not happen. Closing the gap properly needs a store-only
 * //   mode on that shared route, which is the WIZARD'S CRITICAL PATH - Scott's call.
 * ⚠⚠ **THE WIZARD IS UNTOUCHED AND THAT IS PROVED, NOT ASSERTED:** `mode` defaults to
 * `"apply"`, the wizard's three call sites pass none, and a default upload puts no extra form
 * field on the wire at all.
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
      <>
        {/* ⚠⚠ THE DISABLED TWIN (`E723` item 8) — the same `.pm-btn` box, visibly dead.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <div className="mt-3"><span aria-disabled="true"
            //     className="cursor-not-allowed text-[13px] font-bold text-ink-3"> */}
        <span aria-disabled="true" className="pm-btn">
          Rebuild From New Résumé
        </span>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
          {/* ⚠⚠ THE REASON, NOT AN APOLOGY, AND NO ROADMAP (ruling 18). ⚠⚠⚠ IT NAMES NO
              ENVIRONMENT VARIABLE: this string is read by members, and the availability
              endpoint deliberately returns a BOOLEAN so no key or detail can leak to it. */}
          Résumé reading is unavailable here right now.
        </p>
      </>
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
            ⚠⚠⚠ THE SENTENCE CHANGED BECAUSE THE BEHAVIOUR DID (`E721` item 2). The upload no
            longer writes anything, so promising a preview is now a promise the code keeps —
            which is the only condition on which `E561` WS-B allows this kind of copy to ship.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — true while the upload applied:
            //   Reading a new file adds what it finds to your profile. It never replaces
            //   anything you typed yourself.
          */}
          <p className="text-[12px] leading-relaxed text-ink-2">
            We read the file and show you what changed. Nothing is saved until you
            tick it.
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
          /* ⚠⚠⚠ THE OPT-IN (`E721` item 2). ⚠ Without it this branch would apply on upload,
             which is the whole defect. ⚠⚠ The wizard passes no `mode` and is unaffected. */
          mode="store-only"
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
            /*
              ⚠⚠⚠ THE DOCUMENT IS ON FILE AND **NOTHING HAS BEEN WRITTEN TO THE PROFILE**
              (`E721` item 2), so the panel below is the real approval step rather than a
              second pass over an already-applied import.
              ⚠ SUPERSEDED, quoted not deleted (`E164`) — it was TRUE when the upload applied,
              and would now be a plain falsehood:
              //   setReceipt("Read. Your profile has been updated.");
              ⚠⚠ NO `router.refresh()` EITHER: there is nothing new on the server to re-read,
              and refreshing would suggest something had landed.
            */
            setError(null);
            setReceipt(null);
            setStage("panel");
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/*
        ── ⚠⚠⚠ A BUTTON NOW, NOT A TEXT LINK (`P2-A2-E723` item 8) ──────────────────────

        ⚠ **SCOTT'S SKETCH: *"Rebuild From New Résumé becomes a button under it: same width,
        height, radius and text size; white, 1px ink border, 8px gap."***
        ⚠⚠ **`E720` SHIPPED IT AS A MAGENTA TEXT LINK ON SCOTT'S OWN INSTRUCTION** — *"a
        magenta text link under How Others See My Profile"* — and the sketch of 2026-09-30
        supersedes that (rule 13). ⚠⚠⚠ **IT REUSES `.pm-btn` RATHER THAN RESTATING FOUR
        FIGURES**, so "same width, height, radius and text size" holds by construction and
        keeps holding if the primary above it ever changes.
        ⚠ `E433` IS NOT BROKEN BY THIS: the ink button above is still the one solid fill and
        still the only primary; this is the outlined secondary, the same face `Message` and
        `Connect as a Colleague` wear on the visitor rail.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <div className="mt-3">
        //   {/* A MAGENTA TEXT LINK, WHICH IS SCOTT'S WORD FOR IT - and E433's rule working
        //       as intended: magenta is the link affordance, and the ink button above it is
        //       the page's primary. A second solid button here would claim a second primary.
        //   <button type="button" data-e720-rebuild onClick={() => setStage("choose")}
        //     className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark">
      */}
      <button
        type="button"
        data-e720-rebuild
        onClick={() => setStage("choose")}
        className="pm-btn transition-colors"
      >
        Rebuild From New Résumé
      </button>
      {receipt && (
        <p className="mt-2 text-[12px] font-semibold text-emerald-700">✓ {receipt}</p>
      )}
    </>
  );
}
