"use client";

import { useEffect, useState } from "react";
import { CompanySort } from "@/components/onboarding/CompanySort";
import { useRouter } from "next/navigation";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";
import {
  ResumeUploadModal,
  type ImportOutcome,
} from "@/components/onboarding/ResumeUploadModal";

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
  const [justUploaded, setJustUploaded] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/resume-ai/available")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setInfo(d))
      .catch(() => live && setInfo({ available: false, hasDocument: false, documentName: null }));
    return () => {
      live = false;
    };
  }, []);

  if (!info) return null;

  if (!info.available) {
    return (
      <>
        {}
        <span aria-disabled="true" className="pm-btn">
          Rebuild From New Résumé
        </span>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
          {}
          Résumé reading is unavailable here right now.
        </p>
      </>
    );
  }

  if (stage === "panel") {
    return (
      <div className="mt-3">
        {}
        {}
        <ResumeImportAction
          label="Read it again"
          showContext
          autoStart={justUploaded}
          reuseStored={justUploaded}
          onApplied={() => {
            setApplied(true);
            router.refresh();
          }}
          emptyFallback={
            <p className="text-[13px] text-ink-2">
              We saved the file, but there is no readable text in it yet, so there is
              nothing to show. Try uploading it again, or a PDF or Word version.
            </p>
          }
        />
        {}
        {/* After the read is saved, the member sorts the companies it found (2026-10-05). */}
        {applied && <CompanySort onSaved={() => router.refresh()} />}
        {error && (
          <p role="alert" className="mt-2 text-[12px] text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (stage === "choose") {
    return (
      <div className="mt-3 rounded-brand border border-line bg-white p-3.5">
        <p className="text-[13px] font-bold text-ink">Rebuild from a résumé</p>
        <div className="mt-2.5 flex flex-col items-start gap-2">
          {}
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="border border-ink px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-black/[0.04]"
          >
            Upload a New Résumé
          </button>
          {}
          <p className="text-[12px] leading-relaxed text-ink-2">
            We read the file and show you what changed. Nothing is saved until you
            tick it.
          </p>
          {info.hasDocument && (
            <>
              {}
              <button
                type="button"
                onClick={() => {
                  setJustUploaded(false);
                  setStage("panel");
                }}
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
            /* ⚠ `justUploaded` is what tells the panel to go straight to the
               preview rather than offering to re-read (`E782`). */
            setJustUploaded(true);
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
