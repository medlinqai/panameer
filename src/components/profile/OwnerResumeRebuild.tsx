"use client";

import { useEffect, useState } from "react";
import { ResumeReview } from "@/components/onboarding/ResumeReview";
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
        {/* After the read is saved, the member reviews it chunk by chunk (2026-10-07). */}
        {applied && <ResumeReview onChanged={() => router.refresh()} onContinue={() => { setApplied(false); setStage("link"); router.refresh(); }} />}
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
                Use the One on File
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
          // THE OPT-IN ( item 2). Without it this branch would apply on upload
          mode="store-only"
          onImported={(outcome: ImportOutcome) => {
            setUploadOpen(false);
            if (outcome.status === "FAILED") {
              // A FAILED READ IS REPORTED, NEVER SWALLOWED. records five blocks in
              setError(
                outcome.error ??
                  "We couldn’t read that file. Try a different one."
              );
              return;
            }
            // THE DOCUMENT IS ON FILE AND NOTHING HAS BEEN WRITTEN TO THE PROFILE
            setError(null);
            setReceipt(null);
            // preview rather than offering to re-read .
            setJustUploaded(true);
            setStage("panel");
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* A BUTTON NOW, NOT A TEXT LINK item 8) */}
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
