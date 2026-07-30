"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, Notice } from "@/components/onboarding/controls";
import type { ArtifactView } from "@/lib/artifacts";

/**
 * Attach an artifact to a Work-History entry OR a Project (PJv2 WS4 / E078a).
 *
 * ONE modal for both owners — it takes whichever id it was given and posts it
 * through; the server decides whether that owner is the caller's. Two shapes:
 * UPLOAD a file (private bucket) or point at a URL. The tabs exist because those
 * are genuinely different inputs, not two styles of the same field.
 */
export function ArtifactsModal({
  open,
  onClose,
  owner,
  ownerLabel,
  artifacts,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  /** Exactly one — the server enforces it too. */
  owner: { employerId?: string; projectId?: string };
  ownerLabel: string;
  artifacts: ArtifactView[];
  onChanged: (next: ArtifactView[]) => void;
}) {
  const [mode, setMode] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset between openings so the previous attachment doesn't bleed into the
  // next one — this modal is reused for every employer and project on the page.
  useEffect(() => {
    if (!open) return;
    setMode("UPLOAD");
    setLabel("");
    setUrl("");
    setFilePath(null);
    setFileName(null);
    setError(null);
  }, [open]);

  const post = async (body: unknown): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/provider/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Could not save that artifact.");
        return false;
      }
      onChanged(d.artifacts ?? []);
      return true;
    } catch {
      setError("Could not save that artifact.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/provider/artifact-file", { method: "POST", body });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error ?? "Could not upload that file.");
        return;
      }
      setFilePath(d.path);
      setFileName(d.name);
      // A sensible default label so the common case needs no typing.
      if (!label.trim()) setLabel(d.name ?? "");
    } catch {
      setError("Could not upload that file.");
    } finally {
      setUploading(false);
    }
  };

  const canAdd =
    label.trim() !== "" && (mode === "UPLOAD" ? Boolean(filePath) : url.trim() !== "");

  const add = async () => {
    const ok = await post({
      action: "create",
      artifact: {
        ...owner,
        kind: mode,
        label,
        url: mode === "URL" ? url : null,
        filePath: mode === "UPLOAD" ? filePath : null,
      },
    });
    if (ok) {
      setLabel("");
      setUrl("");
      setFilePath(null);
      setFileName(null);
    }
  };

  const tab = (m: "UPLOAD" | "URL", text: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={
        "rounded-full px-4 py-1.5 text-[13.5px] font-bold transition-colors " +
        (mode === m
          ? "bg-magenta text-white"
          : "border border-line text-ink-2 hover:border-magenta hover:text-magenta")
      }
    >
      {text}
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Artifacts" width="max-w-lg">
      <p className="text-[14px] text-ink-2">
        Proof of the work you did at <b className="text-ink">{ownerLabel}</b> — a
        document, a deck, a screenshot, or a link to something published.
      </p>

      {artifacts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {artifacts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-line p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{a.label}</p>
                <p className="truncate text-[12.5px] text-ink-2">
                  {a.kind === "UPLOAD" ? `📎 ${a.fileName ?? "file"}` : a.url}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void post({ action: "delete", artifactId: a.id })}
                className="shrink-0 text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-line pt-5">
        <div className="mb-3 flex items-center gap-2">
          {tab("UPLOAD", "Upload A File")}
          {tab("URL", "Add A Link")}
        </div>

        <div className="space-y-3">
          {mode === "UPLOAD" ? (
            <div>
              {filePath ? (
                <div className="flex items-center gap-3 text-[14px]">
                  <span className="truncate font-semibold">📎 {fileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilePath(null);
                      setFileName(null);
                    }}
                    className="text-[13px] font-bold text-ink-2 underline underline-offset-4 hover:text-red-600"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <label className="inline-flex cursor-pointer items-center rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta">
                  {uploading ? "Uploading…" : "Choose A File"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                    }}
                  />
                </label>
              )}
              <p className="mt-1.5 text-[12.5px] text-ink-2">
                Stored privately — shown only when you choose to share it.
              </p>
            </div>
          ) : (
            <Field label="Link">
              <TextInput
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          )}

          <Field label="Label *">
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Solution design deck"
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3">
            <Notice>{error}</Notice>
          </div>
        )}

        <button
          type="button"
          onClick={add}
          disabled={!canAdd || busy}
          className="mt-4 rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add Artifact"}
        </button>
      </div>

      <div className="mt-6 flex justify-end border-t border-line pt-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink hover:border-[#d9d4e2]"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
