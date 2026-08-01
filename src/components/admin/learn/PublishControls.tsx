"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "@/components/admin/learn/primitives";

type Readiness = {
  canPublish: boolean;
  blockers: string[];
  warnings: string[];
  lessons: number;
  playable: number;
  urlMissing: number;
};

/**
 * Publish / unpublish + preview-as-public (WS4).
 *
 * The dialog shows blockers and warnings as two different things because they
 * ARE two different things. A path with no lessons is a dead link and publishing
 * is refused. A path whose lessons all say "coming soon" is a real page — the
 * public catalog already reports "0 ready to watch" honestly — so that's a
 * warning the admin reads and overrides, not a decision this tool makes for them.
 */
export function PublishControls({
  pathId,
  slug,
  status,
  onChanged,
}: {
  pathId: string;
  slug: string;
  status: string;
  onChanged: () => void;
}) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = status === "PUBLISHED";

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/learn/paths/${pathId}/publish`);
    if (r.ok) setReadiness(await r.json());
  }, [pathId]);

  useEffect(() => {
    void load();
  }, [load, status]);

  const apply = async (next: "DRAFT" | "PUBLISHED") => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/learn/paths/${pathId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not change that.");
        return;
      }
      setOpen(false);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <a
        href={`/learn/${slug}${published ? "" : "?preview=1"}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border-[1.5px] border-line px-5 py-2.5 text-[14px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
      >
        {published ? "View Public Page ↗" : "Preview as Public ↗"}
      </a>

      <Button
        type="button"
        tone={published ? "ghost" : "primary"}
        onClick={() => {
          setError(null);
          void load();
          setOpen(true);
        }}
      >
        {published ? "Unpublish" : "Publish"}
      </Button>

      {open && (
        <Modal
          title={published ? "Unpublish This Path?" : "Publish This Path?"}
          onClose={() => setOpen(false)}
        >
          {published ? (
            <p className="text-[14.5px] text-ink-2">
              It will disappear from the public catalog immediately. Anyone already
              enrolled keeps their progress — unpublishing hides the path, it
              doesn&apos;t delete anything.
            </p>
          ) : (
            <div className="space-y-4">
              {readiness && (
                <p className="text-[14.5px] text-ink-2">
                  {readiness.lessons} lesson{readiness.lessons === 1 ? "" : "s"} ·{" "}
                  <span
                    className={
                      readiness.playable > 0
                        ? "font-semibold text-emerald-700"
                        : "font-semibold text-amber-700"
                    }
                  >
                    {readiness.playable} ready to watch
                  </span>
                </p>
              )}

              {readiness?.blockers.map((b) => (
                <p
                  key={b}
                  className="rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700"
                >
                  {b}
                </p>
              ))}

              {readiness?.warnings.map((w) => (
                <p
                  key={w}
                  className="rounded-[10px] bg-amber-500/[0.07] px-4 py-3 text-[14px] text-ink"
                >
                  {w}
                </p>
              ))}

              {readiness?.canPublish && readiness.warnings.length === 0 && (
                <p className="text-[14px] text-emerald-700">
                  Nothing to flag — this path is ready.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" tone="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              tone={published ? "danger" : "primary"}
              disabled={busy || (!published && readiness ? !readiness.canPublish : false)}
              onClick={() => apply(published ? "DRAFT" : "PUBLISHED")}
            >
              {busy
                ? "Saving…"
                : published
                  ? "Unpublish"
                  : readiness && readiness.warnings.length > 0
                    ? "Publish Anyway"
                    : "Publish"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
