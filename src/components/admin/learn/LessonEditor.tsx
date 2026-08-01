"use client";

import { useState } from "react";
import {
  Button,
  Field,
  ImageField,
  Modal,
  PRODUCTION_STATUSES,
  Select,
  TextArea,
  TextInput,
  VideoField,
  CLAIMS_URL,
} from "@/components/admin/learn/primitives";
import { ExpertPicker } from "@/components/admin/learn/ExpertPicker";
import type { TreeLesson, TreeSection } from "@/components/admin/learn/StructureEditor";

/**
 * The Lesson editor (WS3) — the core of this brief.
 *
 * Setting a valid URL is what makes a lesson playable on the public catalog,
 * and the editor says so out loud rather than leaving the admin to infer it
 * from two fields that don't obviously relate. The status ladder and the URL
 * column are separate facts (see learn.ts), and their disagreement is the exact
 * thing the catalog import left behind — so this screen names the disagreement
 * when it exists instead of showing two green-looking fields.
 */
export function LessonEditor({
  lesson,
  section,
  onClose,
  onSaved,
}: {
  lesson: TreeLesson;
  section: TreeSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [runTime, setRunTime] = useState(lesson.runTime ?? "");
  const [vimeoRef, setVimeoRef] = useState(lesson.vimeoRef ?? "");
  const [thumb, setThumb] = useState<string | null>(lesson.thumbnailUrl ?? null);
  const [status, setStatus] = useState(lesson.productionStatus);
  const [expertId, setExpertId] = useState<string | null>(lesson.expertPersonId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUrl = vimeoRef.trim().length > 0;
  const claims = CLAIMS_URL.includes(status);
  const willPlay = hasUrl && claims;

  const save = async () => {
    if (!title.trim()) {
      setError("A lesson needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/learn/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          runTime: runTime || null,
          vimeoRef: vimeoRef || null,
          thumbnailUrl: thumb,
          productionStatus: status,
          expertPersonId: expertId,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that lesson.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit Lesson" onClose={onClose} wide>
      <p className="-mt-3 mb-5 text-[13px] text-ink-2">In {section.title}</p>

      <div className="space-y-5">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>

        <Field label="Description">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Run Time" hint="As you'd write it — 12:34, 1h 05m.">
            <TextInput
              value={runTime}
              onChange={(e) => setRunTime(e.target.value)}
              placeholder="12:34"
            />
          </Field>

          <Field label="Production Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <ExpertPicker
          value={expertId}
          initialName={lesson.expert}
          onChange={setExpertId}
        />

        <ImageField
          label="Thumbnail"
          value={thumb}
          onChange={setThumb}
          hint="Poster art for the lesson. Not the Vimeo thumbnail — a lesson can need one long before it has a video."
        />

        <div className="rounded-brand border border-line p-4">
          <VideoField
            label="Video URL"
            value={vimeoRef}
            onChange={setVimeoRef}
            hint="Paste the Vimeo URL, or just the numeric id. Unlisted videos keep their /hash."
          />

          {/*
            The playability statement. Both halves are required and the admin
            can see which one is missing — the alternative is saving, going to
            the public page, and finding "coming soon" with no explanation.
          */}
          <div className="mt-4 border-t border-line pt-3 text-[13.5px]">
            {willPlay ? (
              <p className="font-semibold text-emerald-700">
                ✓ This lesson will play on /learn.
              </p>
            ) : hasUrl && !claims ? (
              <p className="text-amber-700">
                It has a URL, but the status is still{" "}
                <b>{PRODUCTION_STATUSES.find((s) => s.value === status)?.label}</b>, so
                it stays &ldquo;coming soon&rdquo;. Set it to{" "}
                <button
                  type="button"
                  onClick={() => setStatus("URL_ADDED_TO_LESSON")}
                  className="font-bold text-magenta underline underline-offset-2"
                >
                  URL Added to Lesson
                </button>{" "}
                to publish it.
              </p>
            ) : !hasUrl && claims ? (
              <p className="text-amber-700">
                <b>URL missing.</b> The status says a URL was added, but there isn&apos;t
                one — so this shows as &ldquo;coming soon&rdquo;. This is the gap the
                catalog import left; paste the URL above to close it.
              </p>
            ) : (
              <p className="text-ink-2">
                No video yet — this lesson shows in the outline as &ldquo;coming
                soon&rdquo;. That&apos;s expected until it&apos;s produced.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save Lesson"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The per-section URL table — fast entry for many lessons (WS3).
 *
 * The brief is explicit that pasting URLs one modal at a time doesn't scale to
 * 296 gaps. Each row saves on blur or Enter and reports for itself, so an admin
 * can go down the column without waiting: a failure marks its own row rather
 * than throwing away the whole batch, which is the difference between "one of
 * these twelve was a typo" and "start again".
 */
export function SectionUrlTable({
  section,
  onChanged,
}: {
  section: TreeSection;
  onChanged: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(section.lessons.map((l) => [l.id, l.vimeoRef ?? ""]))
  );
  const [state, setState] = useState<Record<string, "saving" | "saved" | string>>({});

  const commit = async (lessonId: string) => {
    const original = section.lessons.find((l) => l.id === lessonId)?.vimeoRef ?? "";
    const next = values[lessonId] ?? "";
    if (next.trim() === original.trim()) return;

    setState((s) => ({ ...s, [lessonId]: "saving" }));
    const r = await fetch(`/api/admin/learn/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vimeoRef: next.trim() || null }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setState((s) => ({ ...s, [lessonId]: body.error ?? "Could not save that." }));
      return;
    }
    setState((s) => ({ ...s, [lessonId]: "saved" }));
    onChanged();
  };

  return (
    <div className="mb-3 rounded-[12px] border border-line bg-black/[0.015] p-3">
      <p className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
        Video URLs — {section.title}
      </p>
      <table className="w-full text-left text-[13.5px]">
        <tbody>
          {section.lessons.map((l) => {
            const s = state[l.id];
            const missing =
              CLAIMS_URL.includes(l.productionStatus) && !l.vimeoRef?.trim();
            return (
              <tr key={l.id} className="align-top">
                <td className="w-[38%] py-1.5 pr-3">
                  <span className="block truncate">{l.title}</span>
                  {missing && !values[l.id]?.trim() && (
                    <span className="text-[12px] font-bold text-amber-700">
                      URL missing
                    </span>
                  )}
                </td>
                <td className="py-1.5">
                  <input
                    value={values[l.id] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [l.id]: e.target.value }))
                    }
                    onBlur={() => commit(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commit(l.id);
                      }
                    }}
                    placeholder="https://vimeo.com/…"
                    className="w-full rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13.5px] outline-none focus:border-magenta"
                  />
                  {s === "saving" && (
                    <span className="text-[12px] text-ink-2">Saving…</span>
                  )}
                  {s === "saved" && (
                    <span className="text-[12px] font-semibold text-emerald-700">
                      ✓ Saved — this lesson now plays
                    </span>
                  )}
                  {s && s !== "saving" && s !== "saved" && (
                    <span className="text-[12px] text-red-700">{s}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
