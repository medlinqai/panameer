"use client";

import { useEffect, useState } from "react";
import { Field, TextInput } from "@/components/admin/learn/primitives";

type Expert = { id: string; name: string; email: string | null; photoUrl: string | null };

/**
 * Person picker for the `expert_person_id` on a path or a lesson.
 *
 * Search-as-you-type rather than a `<select>` of everyone: the Person table is
 * every registered user, not a short staff list, so a select would be unusable
 * and would also load the whole roster into a page that only ever needs one row.
 *
 * Shows the ALREADY-SELECTED name up front without a search, because an admin
 * opening an existing path needs to see who is on it before deciding whether to
 * change it — a picker that starts empty looks like the field was never set.
 */
export function ExpertPicker({
  value,
  initialName,
  onChange,
  label = "Expert",
}: {
  value: string | null;
  initialName: string | null;
  onChange: (id: string | null, name?: string | null) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Expert[]>([]);
  const [open, setOpen] = useState(false);
  const [chosenName, setChosenName] = useState<string | null>(initialName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/learn/experts?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : { experts: [] }))
        .then((d) => live && setResults(d.experts ?? []))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, open]);

  if (value && !open) {
    return (
      <Field label={label}>
        <div className="mt-1.5 flex items-center gap-3 rounded-[12px] border border-line px-4 py-2.5">
          <span className="text-[14.5px] font-semibold">
            {chosenName ?? "Selected person"}
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setQuery("");
            }}
            className="ml-auto text-[13px] font-bold text-magenta hover:underline"
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null, null);
              setChosenName(null);
            }}
            className="text-[13px] font-bold text-ink-2 hover:text-red-700"
          >
            Clear
          </button>
        </div>
      </Field>
    );
  }

  return (
    <Field label={label} hint="Search by name or email. Any Person can front a path — a provider profile isn't required.">
      <TextInput
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
        placeholder="Search people…"
      />
      {open && query.trim().length >= 2 && (
        <div className="mt-1 max-h-56 overflow-y-auto rounded-[12px] border border-line bg-white">
          {loading && <p className="px-4 py-3 text-[13px] text-ink-2">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-[13px] text-ink-2">No one matches that.</p>
          )}
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p.id, p.name);
                setChosenName(p.name);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] hover:bg-black/[0.03]"
            >
              <span className="font-semibold">{p.name}</span>
              {p.email && <span className="text-[12.5px] text-ink-2">{p.email}</span>}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}
