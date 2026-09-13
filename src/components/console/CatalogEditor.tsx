"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * THE CATALOG EDITOR (`P1-A1.5-E481`).
 *
 * > **SCOTT:** *"There is no way to add/delete/update a Role, Domain, or
 * > Skill…which would be the point of the page, no? Mostly, this should be
 * > editing."*
 *
 * ⚠⚠ IT DECIDES NOTHING. Every rule — a rename is an UPDATE, a delete is
 * refused at a non-zero link count, an add is `origin: ADMIN` — lives in
 * `lib/catalog-write.ts` behind `/api/admin/catalog`. This component collects
 * input and renders the answer. ⚠ A second copy of "is this safe?" in the
 * browser is a copy that can be bypassed with devtools and that drifts.
 *
 * ⚠ THE LINK COUNT IS FETCHED WHEN THE ROW OPENS, not when delete is pressed.
 * The brief: *"Show the link count in the UI BEFORE the admin acts."* An admin
 * should see "12 providers use this" while deciding, not after being refused.
 *
 * ⚠⚠ THERE IS NO CONFIRM DIALOG ON DELETE, AND THAT IS NOT AN OVERSIGHT. Delete
 * is only ever OFFERED when the count is zero; when it is not zero the button
 * is not a button, it is a sentence explaining why Retire is the answer. A
 * confirm dialog would be a way to click past somebody else's data.
 */

export type EditTarget = {
  table: "skill" | "specialization";
  id: string;
  name: string;
  kind?: "PRODUCT" | "METHODOLOGY" | "INDUSTRY";
  status: "ACTIVE" | "RETIRED" | "SUGGESTED";
  origin: "SEED" | "ADMIN" | "PROVIDER";
};

type Links = { total: number; providers: number };

const BTN =
  "rounded-full border-[1.5px] border-line px-3 py-1.5 text-[13px] font-bold " +
  "text-ink transition-colors hover:border-magenta hover:text-magenta-ink " +
  "disabled:cursor-not-allowed disabled:opacity-40";

const FIELD =
  "rounded-[8px] border border-line bg-white px-3 py-1.5 text-[14px] " +
  "outline-none focus:border-magenta";

async function post(body: unknown) {
  const res = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ error: "That didn't save." }))) as {
    ok?: boolean;
    error?: string;
    message?: string;
    links?: number;
  };
}

export function CatalogEditor({
  target,
  onClose,
  /** Destinations for a skill MOVE — `[{roleTypeId, pillarId, label}]`. */
  destinations,
}: {
  target: EditTarget;
  onClose: () => void;
  destinations?: { roleTypeId: string; pillarId: string; label: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(target.name);
  const [kind, setKind] = useState(target.kind ?? "PRODUCT");
  const [links, setLinks] = useState<Links | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  /*
    ⚠ `useState` + a one-shot fetch rather than an effect: the row's link count
    is read once when the editor opens and never changes underneath it. An
    effect here would re-fire on every keystroke in the name field.
  */
  if (links === null && !busy) {
    setBusy(true);
    fetch(`/api/admin/catalog?table=${target.table}&id=${target.id}`)
      .then((r) => r.json())
      .then((d: Links) => setLinks(d))
      .catch(() => setLinks({ total: -1, providers: -1 }))
      .finally(() => setBusy(false));
  }

  const run = async (body: unknown) => {
    setBusy(true);
    setNote(null);
    const r = await post(body);
    setBusy(false);
    if (r.ok) {
      setNote(r.message ?? "Saved.");
      /* ⚠ THE SERVER IS THE SOURCE OF TRUTH — refresh rather than patching a
         local copy of the tree, which is how a grid and its data drift. */
      router.refresh();
    } else {
      setNote(r.error ?? "That didn't save.");
    }
  };

  const retired = target.status === "RETIRED";
  const deletable = links !== null && links.total === 0;

  return (
    <div className="mt-2 rounded-[10px] border border-magenta/30 bg-magenta/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={FIELD + " min-w-[220px] flex-1"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
        />

        {/*
          ⚠⚠ THE `kind` EDIT IS THE REPAIR PATH FOR THE HARD-CODED PRODUCT BUG.
          `onboarding.ts` files every provider-typed specialization as PRODUCT
          whatever it is; this is how an industry gets moved back. The row keeps
          its id, so nobody loses the selection in the move.
        */}
        {target.table === "specialization" && (
          <select
            className={FIELD}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            aria-label="Kind"
          >
            <option value="PRODUCT">Products &amp; Platforms</option>
            <option value="METHODOLOGY">Processes &amp; Methodologies</option>
            <option value="INDUSTRY">Industries</option>
          </select>
        )}

        {destinations && destinations.length > 0 && (
          <select
            className={FIELD}
            defaultValue=""
            aria-label="Move to"
            onChange={(e) => {
              const d = destinations.find((x) => `${x.roleTypeId}|${x.pillarId}` === e.target.value);
              if (d)
                void run({
                  action: "skill.move",
                  id: target.id,
                  roleTypeId: d.roleTypeId,
                  pillarId: d.pillarId,
                });
            }}
          >
            <option value="">Move to…</option>
            {destinations.map((d) => (
              <option key={`${d.roleTypeId}|${d.pillarId}`} value={`${d.roleTypeId}|${d.pillarId}`}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={BTN}
          disabled={busy || name.trim() === target.name}
          onClick={() =>
            void run(
              target.table === "specialization"
                ? { action: "spec.rename", id: target.id, name: name.trim() }
                : { action: "skill.rename", id: target.id, name: name.trim() }
            )
          }
        >
          Rename
        </button>

        {target.table === "specialization" && kind !== target.kind && (
          <button
            type="button"
            className={BTN}
            disabled={busy}
            onClick={() => void run({ action: "spec.kind", id: target.id, kind })}
          >
            Move to {kind === "PRODUCT" ? "Products" : kind === "INDUSTRY" ? "Industries" : "Processes"}
          </button>
        )}

        {/* ⚠ ALWAYS AVAILABLE, ALWAYS SAFE — links are untouched either way. */}
        <button
          type="button"
          className={BTN}
          disabled={busy}
          onClick={() =>
            void run({
              action: "status",
              table: target.table,
              id: target.id,
              status: retired ? "ACTIVE" : "RETIRED",
            })
          }
        >
          {retired ? "Reactivate" : "Retire"}
        </button>

        {/*
          ⚠⚠ DELETE IS OFFERED ONLY AT ZERO LINKS. Otherwise it is not a
          disabled button either — it is the sentence below, which says what is
          in the way and what to do instead.
        */}
        {deletable && (
          <button
            type="button"
            className={BTN + " hover:border-red-500 hover:text-red-600"}
            disabled={busy}
            onClick={() => void run({ action: "delete", table: target.table, id: target.id })}
          >
            Delete
          </button>
        )}

        <button type="button" className={BTN + " ml-auto"} onClick={onClose} disabled={busy}>
          Close
        </button>
      </div>

      <p className="mt-2 text-[12px] text-ink-2">
        {links === null
          ? "Counting who uses this…"
          : links.total === 0
            ? "Nothing points at this row, so it can be deleted outright."
            : `⚠ ${links.total} record${links.total === 1 ? "" : "s"} point at this row ` +
              `(${links.providers} provider${links.providers === 1 ? "" : "s"}). ` +
              `It cannot be deleted — retire it instead: everyone who already picked it keeps it, ` +
              `and nobody is offered it again.`}
        {" · "}
        <span className="text-ink-2/70">
          {target.origin === "SEED"
            ? "From the seed catalog."
            : target.origin === "ADMIN"
              ? "Added by an admin — the seed will not touch it."
              : "Typed in by a provider."}
        </span>
      </p>

      {note && <p className="mt-1 text-[12.5px] font-semibold text-magenta-ink">{note}</p>}
    </div>
  );
}

/**
 * The add form, and the bar `E479` took away.
 *
 * ⚠ `E479` stopped rendering `CatalogEditBar` precisely so it could come back
 * meaning something. It said *"editing needs write endpoints that aren't built
 * yet"*; they are built now, so this is the same slot carrying a live control.
 */
export function CatalogAddBar({
  table,
  roleTypeId,
  pillarId,
  label = "row",
}: {
  table: "skill" | "specialization";
  roleTypeId?: string;
  pillarId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"PRODUCT" | "METHODOLOGY" | "INDUSTRY">("PRODUCT");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    setNote(null);
    const r = await post(
      table === "specialization"
        ? { action: "spec.add", name: name.trim(), kind }
        : { action: "skill.add", name: name.trim(), roleTypeId, pillarId }
    );
    setBusy(false);
    if (r.ok) {
      setName("");
      setNote(r.message ?? "Added.");
      router.refresh();
    } else setNote(r.error ?? "That didn't save.");
  };

  const ready = name.trim().length >= 2 && (table === "specialization" || (roleTypeId && pillarId));

  return (
    <div className="mt-4 rounded-[12px] border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={FIELD + " min-w-[220px] flex-1"}
          placeholder={`Add a ${label}…`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={`New ${label}`}
        />
        {table === "specialization" && (
          <select
            className={FIELD}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            aria-label="Kind"
          >
            <option value="PRODUCT">Products &amp; Platforms</option>
            <option value="METHODOLOGY">Processes &amp; Methodologies</option>
            <option value="INDUSTRY">Industries</option>
          </select>
        )}
        <button type="button" className={BTN} disabled={busy || !ready} onClick={() => void add()}>
          Add
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink-2">
        {/* ⚠ SAYS THE THING THAT MATTERS: the row is protected from the seed. */}
        Added rows are marked <b>ADMIN</b> and survive every catalog reseed.
      </p>
      {note && <p className="mt-1 text-[12.5px] font-semibold text-magenta-ink">{note}</p>}
    </div>
  );
}
