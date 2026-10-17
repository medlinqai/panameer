"use client";

import { useRef, useState } from "react";
import type { ImportOutcome } from "@/components/onboarding/ResumeUploadModal";
import { ParseHeartbeat } from "@/components/onboarding/ParseHeartbeat";

const ACCEPT =
  ".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,text/rtf,text/plain";
const MAX_BYTES = 5 * 1024 * 1024;

export function ResumeDropzone({
  onImported,
  onBusyChange,
}: {
  onImported: (outcome: ImportOutcome) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [got, setGot] = useState<ImportOutcome | null>(null);

  // Every busy transition goes through here, so the step's footer and this
  // control can never disagree about whether a parse is running.
  const setBusyBoth = (v: boolean) => {
    setBusy(v);
    onBusyChange?.(v);
  };

  const reset = () => {
    setFile(null);
    setProgress(null);
    setError(null);
    setBusyBoth(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const choose = (f: File) => {
    setError(null);
    if (f.size > MAX_BYTES) {
      setError("That file is larger than 5 MB. Please choose a smaller file.");
      return;
    }
    setFile(f);
    // Upload immediately — an extra "confirm" click is the kind of friction
    // this step exists to remove.
    upload(f);
  };

  const upload = (f: File) => {
    setBusyBoth(true);
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", f);
    form.append("source", "RESUME");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/onboarding/provider/import");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setBusyBoth(false);
      let data: ImportOutcome & { error?: string };
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        setError("Something went wrong reading that file.");
        return;
      }
      // 422 = the request was fine but no text could be extracted (scanned or
      // protected file). User-fixable, not a crash.
      if (xhr.status >= 400 && xhr.status !== 422) {
        setError(data.error ?? "We couldn't import that file.");
        return;
      }
      if (data.status === "FAILED") {
        setError(data.error ?? "We couldn't read that file.");
        return;
      }
      setGot(data);
      onImported(data);
      setProgress(100);
    };
    xhr.onerror = () => {
      setBusyBoth(false);
      setError("The upload failed. Please try again.");
    };
    xhr.send(form);
  };

  return (
    <div>
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
          "relative grid place-items-center border border-dashed p-8 text-center transition-colors " +
          (dragOver ? "border-magenta bg-magenta/[0.04]" : "border-line")
        }
      >
        {/* Busy trace — four thin magenta segments circling the box, echoing the segmented logo mark. */}
        {busy && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            <rect
              width="100%"
              height="100%"
              fill="none"
              pathLength={100}
              className="animate-dropzone-trace stroke-magenta"
              strokeWidth={1.5}
              strokeDasharray="7 18"
              strokeLinecap="round"
            />
          </svg>
        )}
        {file && !error ? (
          <div className="w-full max-w-sm">
            <p className="truncate font-bold">{file.name}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {(file.size / 1024).toFixed(0)} KB
            </p>
            {}
            {busy && progress !== null && progress < 100 && (
              <>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-magenta transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[13px] text-ink-2">Uploading… {progress}%</p>
              </>
            )}
            {busy && progress === 100 && <ParseHeartbeat className="mt-3" />}
            {!busy && (
              // Scott 10-16: show what the résumé gave them, so the upload feels worth it.
              <div data-resume-got className="mt-3 text-left text-[13.5px]">
                <p className="font-bold">We read your résumé and filled your profile:</p>
                <ul className="mt-1 list-disc pl-5 text-ink-2">
                  {got?.applied.headline && <li>Your title</li>}
                  {!!got?.applied.experiences && <li>{got.applied.experiences} job{got.applied.experiences === 1 ? "" : "s"} in your work history</li>}
                  {!!got?.applied.skillsMatched && <li>{got.applied.skillsMatched} skills buyers search for{got.applied.skillsMatchedNames?.length ? ` (${got.applied.skillsMatchedNames.slice(0, 4).join(", ")}${got.applied.skillsMatchedNames.length > 4 ? "…" : ""})` : ""}</li>}
                  {!!got?.applied.education && <li>{got.applied.education} school{got.applied.education === 1 ? "" : "s"}</li>}
                  {got?.applied.overview && <li>Your summary</li>}
                  {!!got?.applied.languages && <li>{got.applied.languages} language{got.applied.languages === 1 ? "" : "s"}</li>}
                </ul>
                <p className="mt-1 text-[12.5px] text-ink-2">Press Next to check it.</p>
              </div>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-[14px] font-bold text-ink-2 underline underline-offset-4 hover:text-magenta"
            >
              Upload a Different File
            </button>
          </div>
        ) : (
          <>
            <p className="font-bold">Drag and drop your résumé here</p>
            <p className="mt-1 text-[14px] text-ink-2">
              Word works best (it can also bring in your photo) · PDF and rich text work too · up to 5 MB
            </p>
            {/* E184 — the upload IS the consent now. The AI pass used to be a */}
            <p className="mt-1 text-[13px] text-ink-2">
              Panameer AI reads it to fill in your profile.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 bg-ink px-6 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover"
            >
              Choose File
            </button>
          </>
        )}
      </div>

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
        <p className="mt-3 text-[14px] font-semibold text-magenta-dark">
          {error}
        </p>
      )}
    </div>
  );
}
