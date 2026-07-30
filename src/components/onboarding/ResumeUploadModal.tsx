"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/Modal";

/**
 * "Add your resume" modal (brief_P / E012).
 *
 * Deck flow: drag-and-drop or choose a file (PDF / Word / rich text, ≤5 MB) →
 * upload progress → attached-file row with ✓ and a delete → Continue, which
 * parses the document and populates the profile.
 *
 * Also serves the LinkedIn path: LinkedIn has no public API for work history
 * (that needs Partner approval), so "Import from LinkedIn" asks for the
 * profile's own "Save to PDF" export and runs it through this same pipeline.
 *
 * XMLHttpRequest rather than fetch: fetch still can't report upload progress,
 * and the deck's progress bar is part of the spec.
 */

const ACCEPT =
  ".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain";
const MAX_BYTES = 5 * 1024 * 1024;

export type ImportOutcome = {
  status: "PARSED" | "FAILED";
  applied: {
    headline: boolean;
    overview: boolean;
    experienceLevel: string | null;
    experienceYears: number | null;
    experiences: number;
    education: number;
    skillsMatched: number;
    skillsMatchedNames: string[];
    skillsUnmatched: string[];
    languages: number;
  };
  gaps: string[];
  error?: string;
  state?: unknown;
};

export function ResumeUploadModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;

  onImported: (outcome: ImportOutcome) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isLinkedIn = false;

  const reset = () => {
    setFile(null);
    setProgress(null);
    setError(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const choose = (f: File) => {
    setError(null);
    if (f.size > MAX_BYTES) {
      setError("That file is larger than 5 MB. Please choose a smaller file.");
      return;
    }
    setFile(f);
    setProgress(100); // selected + ready; the bar animates during upload
  };

  const upload = () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    form.append("source", "RESUME");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/onboarding/provider/import");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setBusy(false);
      let data: ImportOutcome & { error?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        setError("Something went wrong reading that file.");
        return;
      }
      // 422 = we read the request fine but couldn't extract text (scanned or
      // protected file). That's a user-fixable outcome, not a crash.
      if (xhr.status >= 400 && xhr.status !== 422) {
        setError(data.error ?? "We couldn't import that file.");
        return;
      }
      if (data.status === "FAILED") {
        setError(data.error ?? "We couldn't read that file.");
        return;
      }
      onImported(data);
      reset();
      onClose();
    };
    xhr.onerror = () => {
      setBusy(false);
      setError("The upload failed. Please try again.");
    };
    xhr.send(form);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) {
          reset();
          onClose();
        }
      }}
      title="Add Your Resume"
    >
      {isLinkedIn && (
        <ol className="mb-5 space-y-1.5 rounded-brand border border-line bg-bg-soft p-4 text-[14px] text-ink-2">
          <li className="mb-2 text-ink">
            LinkedIn doesn&apos;t allow apps to read your profile directly, so
            export it and upload the file:
          </li>
          <li>
            <b className="text-ink">1.</b> Open your LinkedIn profile.
          </li>
          <li>
            <b className="text-ink">2.</b> Click <b className="text-ink">More</b> →{" "}
            <b className="text-ink">Save to PDF</b>.
          </li>
          <li>
            <b className="text-ink">3.</b> Upload the downloaded file below.
          </li>
        </ol>
      )}

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) choose(f);
          }}
          className={
            "grid place-items-center rounded-brand border-2 border-dashed p-10 text-center transition-colors " +
            (dragOver ? "border-magenta bg-magenta/[0.04]" : "border-line")
          }
        >
          <p className="font-bold">Drag and drop your file here</p>
          <p className="mt-1 text-[14px] text-ink-2">
            PDF, Word, or rich text · up to 5 MB
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            Choose File
          </button>
        </div>
      ) : (
        <div className="rounded-brand border border-line p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-8 w-8 flex-none place-items-center rounded-full bg-emerald-50 text-[15px] font-black text-emerald-600"
            >
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="text-[13px] text-ink-2">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              aria-label="Remove file"
              className="grid h-8 w-8 place-items-center rounded-full text-[16px] text-ink-2 transition-colors hover:bg-bg-soft hover:text-red-600 disabled:opacity-50"
            >
              🗑
            </button>
          </div>

          {progress !== null && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-magenta transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {busy && (
            <p className="mt-2 text-[13px] text-ink-2">
              {progress === 100 ? "Reading your document…" : `Uploading… ${progress}%`}
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) choose(f);
        }}
      />

      {error && (
        <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => {
            reset();
            onClose();
          }}
          disabled={busy}
          className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={upload}
          disabled={!file || busy}
          className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Working…" : "Continue"}
        </button>
      </div>
    </Modal>
  );
}
