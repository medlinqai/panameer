"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Field, TextInput, TextArea } from "@/components/onboarding/controls";
import {
  CertificationAttachment,
  type CertificationDraft,
} from "@/components/onboarding/CertificationsEditor";

/**
 * Certifications as cards + a proper modal (brief_X / E057).
 *
 * E057: the old inline `CertificationsEditor` put an eight-field form inside
 * the review page's narrow sidebar column — labels collided, inputs were
 * unusable, and Scott's verdict was "just does not work". A certification has
 * as many fields as an education entry, so it gets the same treatment: a card
 * list, and an "Edit Certification" modal with full-width fields, mirroring
 * `EducationCards`.
 *
 * Saving is EXPLICIT and immediate. `onSave` receives the WHOLE next list —
 * not a patch and not a read of the caller's state — because the caller
 * persists by replacing the collection, and reading that list back out of React
 * state in the same tick is how a save silently writes the previous version.
 * The modal stays open when the save fails, so a failed write can't look like a
 * successful one.
 */

const emptyCertification = (): CertificationDraft => ({
  name: "",
  issuer: null,
  year: null,
  issuedOn: null,
  expiresOn: null,
  credentialId: null,
  url: null,
  attachmentPath: null,
  attachmentName: null,
  notes: null,
});

/** A representative list — the field accepts anything typed. */
const AGENCIES = [
  // E108 — Panameer issues its own credentials through Learn (brief_learn_v1
  // WS5), so it belongs in the list a provider picks from. First, because it is
  // the one this platform can vouch for.
  "Panameer",
  "Amazon Web Services",
  "APICS / ASCM",
  "Axelos",
  "Cisco",
  "CompTIA",
  "Google Cloud",
  "IBM",
  "Institute for Supply Management (ISM)",
  "ISACA",
  "Microsoft",
  "Oracle",
  "PMI (Project Management Institute)",
  "Salesforce",
  "SAP",
  "Scrum Alliance",
  "ServiceNow",
  "Six Sigma Institute",
  "Workday",
];

function certMeta(c: CertificationDraft): string {
  return [
    c.issuer,
    c.issuedOn ? `issued ${c.issuedOn.slice(0, 4)}` : c.year,
    c.expiresOn ? `expires ${c.expiresOn.slice(0, 4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CertificationCards({
  items,
  onSave,
  busy = false,
  /** Opens the add-modal from outside (the review page's click-to-fix). */
  openSignal = 0,
}: {
  items: CertificationDraft[];
  onSave: (next: CertificationDraft[]) => Promise<boolean>;
  busy?: boolean;
  openSignal?: number;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<CertificationDraft>(emptyCertification());
  /**
   * E108 — is the agency being typed rather than picked? Held as state rather
   * than derived from the value, so an existing certification whose issuer isn't
   * in the list opens in the free-text box instead of silently losing it.
   */
  const [otherAgency, setOtherAgency] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seenSignal, setSeenSignal] = useState(openSignal);

  // A bump of `openSignal` means "open the add modal". Derived during render
  // rather than in an effect: an effect would open it one paint late, and the
  // click-to-fix link is meant to feel like the button it points at.
  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal);
    setDraft(emptyCertification());
    setEditing(-1);
    setError(null);
  }

  const openEdit = (i: number) => {
    // An issuer we don't list is still an issuer — open it in the text box.
    const issuer = items[i].issuer ?? "";
    setOtherAgency(Boolean(issuer) && !AGENCIES.includes(issuer));
    setDraft({ ...items[i] });
    setEditing(i);
    setError(null);
  };
  const close = () => {
    setEditing(null);
    setError(null);
  };

  const commit = async (next: CertificationDraft[]) => {
    if (await onSave(next)) close();
    else setError("We couldn't save that. Please try again.");
  };

  const save = async () => {
    // The server drops nameless rows on write, so an unnamed certification
    // would vanish without a word. Catch it here where it can be explained.
    if (!draft.name.trim()) {
      setError("Certification name is required.");
      return;
    }
    if (draft.issuedOn && draft.expiresOn && draft.expiresOn < draft.issuedOn) {
      setError("The expiry date can't be before the issue date.");
      return;
    }
    const clean: CertificationDraft = {
      ...draft,
      name: draft.name.trim(),
      issuer: draft.issuer?.trim() || null,
      // `year` is the legacy year-only column and still the fallback the
      // published profile renders when there is no full date — keep the two
      // consistent instead of letting them disagree.
      year: draft.issuedOn ? Number(draft.issuedOn.slice(0, 4)) : draft.year,
    };
    await commit(
      editing === -1
        ? [...items, clean]
        : items.map((it, i) => (i === editing ? clean : it))
    );
  };

  const remove = async () => {
    if (editing === null || editing < 0) return close();
    await commit(items.filter((_, i) => i !== editing));
  };

  return (
    <div>
      {items.length > 0 ? (
        /*
          E109 — a LIST, matching Education, not a stack of boxes.

          Education renders through `EducationBody` on the review while
          certifications rendered through these bordered, bold cards, so two
          sections holding the same shape of information looked like different
          products — and with three or four certifications the page became a
          column of heavy boxes ("comical", per the walk). Same type scale as
          Education now: semibold name, meta in ink-2, no per-item border, and
          the edit affordance kept but quieted.
        */
        <ul className="space-y-3 text-[14px]">
          {items.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              className="flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                {certMeta(c) && (
                  <p className="text-ink-2">{certMeta(c)}</p>
                )}
                {c.credentialId && (
                  <p className="text-[13px] text-ink-2">
                    Credential ID {c.credentialId}
                  </p>
                )}
                {c.notes && (
                  <p className="text-[13px] text-ink-2">{c.notes}</p>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-3">
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-bold text-magenta hover:text-magenta-dark"
                    >
                      Verify →
                    </a>
                  )}
                  {c.attachmentName && (
                    <span className="text-[13px] text-ink-2">
                      📎 {c.attachmentName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEdit(i)}
                aria-label={`Edit ${c.name}`}
                className="shrink-0 text-[13px] font-bold text-magenta hover:text-magenta-dark"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-2">
          No certifications yet. Adding your credentials increases your chances
          of getting hired.
        </p>
      )}

      {/*
        NO BODY BUTTON (walk7 WS6 / E144). The review renders this inside a card
        that already carries a "+ Add Certification" link in its header, so the
        section offered the same action twice, a few pixels apart.

        The header link is the one that stays — it is where every other section
        puts its affordance, so Certifications stops being the exception. This
        reverses the E130 rule for THIS section on Scott's directive, and
        reconciles with brief_profile_tiers_review WS3, whose empty-state rule
        pointed the other way; the two were going to fight over one button.

        The header link opens this component's modal through `openSignal`, so
        the capability is untouched — only the second copy of the button is
        gone. Its `openAdd` handler went with it: lint showed it had no other
        caller, and a comment claiming otherwise would have been wrong.
      */}

      <Modal
        open={editing !== null}
        onClose={close}
        title={editing === -1 ? "Add Certification" : "Edit Certification"}
      >
        <div className="space-y-4">
          <Field label="Certification *">
            <TextInput
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Oracle Cloud Procurement Certified"
            />
          </Field>

          {/*
            E108 — a real SELECT with an explicit "Other…", not a datalist.

            A datalist looks like a text box, so nobody discovers the list: the
            walk showed providers typing an agency that was sitting two
            keystrokes away in the suggestions. Worse, it accepts anything
            silently, which is how one issuer ends up stored three ways. The
            select makes the vocabulary visible, and "Other…" makes leaving it a
            deliberate act that then REQUIRES the free-text field — so an
            unlisted agency is still captured, just never by accident.
          */}
          <Field label="Certifying Agency">
            {otherAgency ? (
              <div className="flex items-center gap-2">
                <TextInput
                  autoFocus
                  value={draft.issuer ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, issuer: e.target.value || null })
                  }
                  placeholder="Type the agency"
                />
                <button
                  type="button"
                  onClick={() => {
                    setOtherAgency(false);
                    setDraft({ ...draft, issuer: null });
                  }}
                  className="shrink-0 text-[13px] font-bold text-magenta hover:text-magenta-dark"
                >
                  Pick
                </button>
              </div>
            ) : (
              <select
                value={AGENCIES.includes(draft.issuer ?? "") ? draft.issuer ?? "" : ""}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setOtherAgency(true);
                    setDraft({ ...draft, issuer: null });
                  } else {
                    setDraft({ ...draft, issuer: e.target.value || null });
                  }
                }}
                className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
              >
                <option value="">Choose an agency…</option>
                {AGENCIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
                <option value="__other__">Other…</option>
              </select>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issue Date">
              <TextInput
                type="date"
                value={draft.issuedOn ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, issuedOn: e.target.value || null })
                }
              />
            </Field>
            <Field label="Expires" hint="Leave empty if it doesn't expire.">
              <TextInput
                type="date"
                value={draft.expiresOn ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, expiresOn: e.target.value || null })
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Credential ID">
              <TextInput
                value={draft.credentialId ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, credentialId: e.target.value || null })
                }
                placeholder="Optional"
              />
            </Field>
            <Field label="Verify URL" hint="A link a buyer can check.">
              <TextInput
                type="url"
                value={draft.url ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, url: e.target.value || null })
                }
                placeholder="https://…"
              />
            </Field>
          </div>

          <Field label="Notes">
            <TextArea
              value={draft.notes ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, notes: e.target.value || null })
              }
              placeholder="Anything a buyer should know about this credential."
            />
          </Field>

          <CertificationAttachment
            value={{
              path: draft.attachmentPath ?? null,
              name: draft.attachmentName ?? null,
            }}
            onChange={(a) =>
              setDraft({
                ...draft,
                attachmentPath: a.path,
                attachmentName: a.name,
              })
            }
          />
        </div>

        {error && (
          <p className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={remove}
            disabled={editing === -1 || busy}
            className="text-[15px] font-semibold text-red-600 underline underline-offset-4 hover:text-red-700 disabled:opacity-40"
          >
            Delete
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
