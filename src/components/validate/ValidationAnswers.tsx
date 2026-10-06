"use client";

import { useState } from "react";

export function ValidationAnswers({
  token,
  declined,
  projectName,
  providerName,
}: {
  token: string;
  declined: boolean;
  projectName: string;
  providerName: string;
}) {
  const [workedFrom, setWorkedFrom] = useState("");
  const [workedTo, setWorkedTo] = useState("");
  const [roleNote, setRoleNote] = useState("");
  const [skills, setSkills] = useState("");
  const [again, setAgain] = useState<"YES" | "MAYBE" | "NO" | "">("");
  const [testimonial, setTestimonial] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [showPublic, setShowPublic] = useState(false);
  const [namePublic, setNamePublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/validate/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          responderName: name,
          responderTitle: title,
          workedFrom: workedFrom || null,
          workedTo: workedTo || null,
          roleNote,
          skillsNoted: skills.split(",").map((s) => s.trim()).filter(Boolean),
          wouldWorkAgain: again || null,
          testimonial,
          testimonialPublic: showPublic,
          attributionPublic: namePublic,
        }),
      });
      if (!r.ok) {
        setError("We couldn't save that. Your confirmation is safe either way.");
        return;
      }
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-magenta";

  if (saved) {
    return (
      <div className="rounded-brand border border-line bg-white p-6 text-center">
        <p className="text-[15px] font-bold">Thank you — that&apos;s saved.</p>
        <p className="mt-1 text-[14px] text-ink-2">
          You can close this page.
        </p>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="rounded-brand border border-line bg-white p-6">
        <p className="text-[15px] font-bold">
          Anything you&apos;d like us to know? (Optional)
        </p>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Only Panameer sees this. It is not shown on anyone&apos;s profile.
        </p>
        <textarea
          value={testimonial}
          onChange={(e) => setTestimonial(e.target.value)}
          rows={3}
          className={field + " mt-3"}
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {error && <span className="text-[13.5px] text-red-700">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-brand border border-line bg-white p-6">
      <p className="text-[16px] font-bold">
        Five quick questions, all optional
      </p>
      <p className="mt-1 text-[13.5px] text-ink-2">
        {providerName}&apos;s confirmation is already recorded — this just adds
        detail. Answer any, or none, and close the page whenever you like.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label className="text-[14px] font-bold">
            When did you work together?
          </label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <input type="month" value={workedFrom} onChange={(e) => setWorkedFrom(e.target.value)} className={field} aria-label="From" />
            <input type="month" value={workedTo} onChange={(e) => setWorkedTo(e.target.value)} className={field} aria-label="To" />
          </div>
        </div>

        <div>
          <label className="text-[14px] font-bold">
            What did they do for you?
          </label>
          <input value={roleNote} onChange={(e) => setRoleNote(e.target.value)} placeholder={`Their role on ${projectName}`} className={field + " mt-2"} />
        </div>

        <div>
          <label className="text-[14px] font-bold">Which skills stood out?</label>
          <p className="mt-1 text-[13px] text-ink-2">Separate them with commas.</p>
          <input value={skills} onChange={(e) => setSkills(e.target.value)} className={field + " mt-2"} />
        </div>

        <div>
          <label className="text-[14px] font-bold">
            Would you work with them again?
          </label>
          <div className="mt-2 flex gap-2">
            {(["YES", "MAYBE", "NO"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAgain(again === v ? "" : v)}
                aria-pressed={again === v}
                className={
                  "border-[1.5px] px-5 py-2 text-[14px] font-bold transition-colors " +
                  (again === v ? "border-magenta bg-magenta text-white" : "border-line text-ink hover:border-magenta")
                }
              >
                {v === "YES" ? "Yes" : v === "MAYBE" ? "Maybe" : "No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[14px] font-bold">
            Anything you&apos;d say to someone considering them?
          </label>
          <textarea value={testimonial} onChange={(e) => setTestimonial(e.target.value)} rows={4} className={field + " mt-2"} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className={field} aria-label="Your name" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your job title (optional)" className={field} aria-label="Your job title" />
        </div>

        {/* TWO TICKBOXES, NOT ONE. "Show what I wrote" and "use my name" are */}
        <div className="space-y-2 rounded-brand border border-line bg-bg-soft/40 p-4">
          <label className="flex items-start gap-2 text-[14px]">
            <input type="checkbox" checked={showPublic} onChange={(e) => setShowPublic(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d72cd6]" />
            <span>Panameer may show what I wrote on {providerName}&apos;s profile.</span>
          </label>
          <label className="flex items-start gap-2 text-[14px]">
            <input type="checkbox" checked={namePublic} onChange={(e) => setNamePublic(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d72cd6]" />
            <span>Panameer may show my name and job title alongside it.</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {error && <span className="text-[13.5px] text-red-700">{error}</span>}
        </div>
      </div>
    </div>
  );
}
