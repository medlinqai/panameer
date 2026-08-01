"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AdminHeading } from "@/components/admin/primitives";
import { Button } from "@/components/admin/learn/primitives";

type Match = {
  row: { line: number; identifier: string; url: string };
  outcome: "matched" | "ambiguous" | "unmatched" | "invalid-url" | "unchanged";
  lessonId?: string;
  lessonPath?: string;
  normalizedRef?: string;
  candidates?: { id: string; path: string }[];
  note?: string;
};

type Plan = {
  rows: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  invalid: number;
  unchanged: number;
  matches: Match[];
  applied?: number;
};

const OUTCOME_LABEL: Record<Match["outcome"], string> = {
  matched: "Will fill",
  unchanged: "Already set",
  ambiguous: "Ambiguous",
  unmatched: "No match",
  "invalid-url": "Bad URL",
};

const OUTCOME_TONE: Record<Match["outcome"], string> = {
  matched: "text-emerald-700",
  unchanged: "text-ink-2",
  ambiguous: "text-amber-700",
  unmatched: "text-amber-700",
  "invalid-url": "text-red-700",
};

/**
 * Bulk URL load (WS5) — how ~296 lessons get their videos in one pass.
 *
 * Two steps that cannot be collapsed into one: upload previews, and only then
 * can you apply. The preview is computed by the same server code that does the
 * write, so what the admin approves is what runs — and only CONFIDENT matches
 * run. Ambiguous and unmatched rows are shown and skipped, never guessed at.
 */
export default function BulkUrlsPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const send = async (text: string, apply: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/learn/bulk-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, apply }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not process that file.");
        return;
      }
      setPlan(body);
      if (apply) setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    setDone(false);
    await send(text, false);
  };

  return (
    <div>
      <Link
        href="/admin/learn"
        className="text-[13.5px] font-bold text-ink-2 hover:text-magenta"
      >
        ← Learn
      </Link>

      <div className="mt-3">
        <AdminHeading
          title="Load Video URLs From CSV"
          subtitle="Fill in many lessons at once. Nothing is written until you've seen what would change."
        />
      </div>

      <div className="rounded-brand border border-line p-5">
        <p className="text-[14px] font-bold">Two columns, no ceremony.</p>
        <p className="mt-1 text-[14px] text-ink-2">
          First column identifies the lesson — either its <b>id</b>, or its full
          path <span className="font-mono text-[13px]">Path › Course › Section › Lesson</span>.
          Second column is the Vimeo URL or id. A header row is detected and skipped.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-[10px] bg-black/[0.03] p-3 font-mono text-[12.5px]">
{`lesson,url
Advanced Procurement › How to Use the Catalogs Application › 1. Course Overview › Generic Course Overview,https://vimeo.com/76979871
0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0,123456789`}
        </pre>
        <p className="mt-3 text-[13px] text-ink-2">
          Rows that match more than one lesson, or none, are reported and{" "}
          <b>left alone</b> — a wrong video looks finished, which is worse than an
          empty one.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <Button type="button" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Reading…" : "Choose CSV"}
          </Button>
          {fileName && (
            <span className="text-[13.5px] text-ink-2">
              {fileName}
              {plan ? ` — ${plan.rows} row${plan.rows === 1 ? "" : "s"}` : ""}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
            {error}
          </p>
        )}
      </div>

      {plan && (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-5">
            <Tally label="Will Fill" value={plan.matched} tone="emerald" />
            <Tally label="Already Set" value={plan.unchanged} />
            <Tally label="Ambiguous" value={plan.ambiguous} tone="amber" />
            <Tally label="No Match" value={plan.unmatched} tone="amber" />
            <Tally label="Bad URL" value={plan.invalid} tone="red" />
          </div>

          {done ? (
            <div className="mt-5 rounded-brand border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="text-[15px] font-bold text-emerald-800">
                Filled {plan.applied} lesson{plan.applied === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                Each one is now playable on /learn. The rows below that didn&apos;t
                match were left untouched — fix the identifiers and upload again.
              </p>
              <Link
                href="/admin/learn"
                className="mt-2 inline-block text-[14px] font-bold text-magenta hover:underline"
              >
                Back to the Learn console →
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-brand border border-line p-5">
              <p className="text-[14.5px]">
                {plan.matched > 0 ? (
                  <>
                    <b>{plan.matched}</b> lesson{plan.matched === 1 ? "" : "s"} will get
                    a URL. Everything else is left alone.
                  </>
                ) : (
                  <>Nothing in this file would change a lesson.</>
                )}
              </p>
              <Button
                type="button"
                className="ml-auto"
                disabled={busy || plan.matched === 0 || !csv}
                onClick={() => csv && send(csv, true)}
              >
                {busy ? "Applying…" : `Fill ${plan.matched} Lesson${plan.matched === 1 ? "" : "s"}`}
              </Button>
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-brand border border-line">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead className="border-b border-line bg-black/[0.02] text-[12.5px] uppercase tracking-wide text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-bold">Line</th>
                  <th className="px-4 py-3 font-bold">Identifier</th>
                  <th className="px-4 py-3 font-bold">Result</th>
                </tr>
              </thead>
              <tbody>
                {plan.matches.map((m) => (
                  <tr key={m.row.line} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink-2">{m.row.line}</td>
                    <td className="max-w-[380px] px-4 py-3">
                      <span className="block truncate">{m.row.identifier || "—"}</span>
                      <span className="block truncate font-mono text-[12px] text-ink-2">
                        {m.row.url}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={"font-bold " + OUTCOME_TONE[m.outcome]}>
                        {OUTCOME_LABEL[m.outcome]}
                      </span>
                      {m.lessonPath && (
                        <span className="block text-[12.5px] text-ink-2">
                          {m.lessonPath}
                        </span>
                      )}
                      {m.note && (
                        <span className="block text-[12.5px] text-ink-2">{m.note}</span>
                      )}
                      {m.candidates && (
                        <ul className="mt-1 list-disc pl-4 text-[12px] text-ink-2">
                          {m.candidates.map((c) => (
                            <li key={c.id}>{c.path}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "red";
}) {
  const colour =
    value === 0
      ? "text-ink-2"
      : tone === "emerald"
        ? "text-emerald-700"
        : tone === "amber"
          ? "text-amber-700"
          : tone === "red"
            ? "text-red-700"
            : "text-ink";
  return (
    <div className="rounded-brand border border-line p-4">
      <p className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">{label}</p>
      <p className={"mt-0.5 text-[24px] font-extrabold " + colour}>{value}</p>
    </div>
  );
}
