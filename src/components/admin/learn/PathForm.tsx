"use client";

import { useEffect, useState } from "react";
import {
  AUDIENCES,
  Button,
  Field,
  ImageField,
  Modal,
  Select,
  TextArea,
  TextInput,
  VideoField,
} from "@/components/admin/learn/primitives";
import { ExpertPicker } from "@/components/admin/learn/ExpertPicker";

export type PathDraft = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  audience: string;
  group: string;
  expertPersonId: string | null;
  expertName?: string | null;
  coverImage: string | null;
  introVideoRef: string;
  status: string;
};

export const EMPTY_PATH: PathDraft = {
  title: "",
  slug: "",
  summary: "",
  audience: "IMPLEMENTER",
  group: "",
  expertPersonId: null,
  coverImage: null,
  introVideoRef: "",
  status: "DRAFT",
};

/** Title → slug, mirroring `slugify` on the server. */
function slugify(v: string) {
  return v
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Create / edit a Learning Path (WS1).
 *
 * The slug auto-fills from the title until the admin types in it, then stops —
 * a slug is a permanent public URL, and silently rewriting one someone chose
 * would break links they had already shared.
 */
export function PathForm({
  initial,
  groups,
  onClose,
  onSaved,
}: {
  initial: PathDraft;
  groups: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PathDraft>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) {
      setDraft((d) => ({ ...d, slug: slugify(d.title) }));
    }
  }, [draft.title, slugTouched]);

  const set = <K extends keyof PathDraft>(k: K, v: PathDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.title.trim()) {
      setError("A learning path needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        draft.id ? `/api/admin/learn/paths/${draft.id}` : "/api/admin/learn/paths",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            slug: draft.slug || null,
            summary: draft.summary || null,
            audience: draft.audience,
            group: draft.group || null,
            expertPersonId: draft.expertPersonId,
            coverImage: draft.coverImage,
            introVideoRef: draft.introVideoRef || null,
            status: draft.status,
          }),
        }
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that path.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={draft.id ? "Edit Learning Path" : "New Learning Path"}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <Field label="Title">
          <TextInput
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Advanced Procurement"
            autoFocus
          />
        </Field>

        <Field
          label="Slug"
          hint="The public URL — /learn/your-slug. Auto-fills from the title until you edit it."
        >
          <TextInput
            value={draft.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            placeholder="advanced-procurement"
          />
        </Field>

        <Field label="Summary" hint="The description shown on the catalog card and the path page.">
          <TextArea
            value={draft.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="What a learner gets out of this path."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Audience">
            <Select value={draft.audience} onChange={(e) => set("audience", e.target.value)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Group" hint="Procurement, Core HR, … — free text; existing values suggested.">
            <TextInput
              list="learn-groups"
              value={draft.group}
              onChange={(e) => set("group", e.target.value)}
              placeholder="Procurement"
            />
            <datalist id="learn-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>
        </div>

        <ExpertPicker
          value={draft.expertPersonId}
          initialName={draft.expertName ?? null}
          onChange={(id) => set("expertPersonId", id)}
        />

        <ImageField
          label="Cover Image"
          value={draft.coverImage}
          onChange={(url) => set("coverImage", url)}
          hint="Shown on the catalog card. Courses and lessons fall back to this when they have no image of their own."
        />

        <VideoField
          label="Intro Video"
          value={draft.introVideoRef}
          onChange={(v) => set("introVideoRef", v)}
          hint="Optional — a 'what you'll learn' clip for the path itself. Not a lesson."
        />

        <Field label="Status" hint="Draft paths are hidden from the public catalog.">
          <Select value={draft.status} onChange={(e) => set("status", e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>
        </Field>

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
            {busy ? "Saving…" : draft.id ? "Save Changes" : "Create Path"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
