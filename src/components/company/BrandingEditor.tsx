"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/casing/Button";
import {
  PANAMEER_DEFAULT_HUE,
  RECIPES,
  isValidHex,
  themeFromHue,
  type ThemeTokens,
} from "@/lib/themeRecipes";

/**
 * The branding editor (E204 WS-B) — logo → colour → recipe → preview → save.
 *
 * THE PREVIEW IS COMPUTED BY THE SAME FUNCTION THAT RENDERS THE APP. Both this
 * component and the server resolver call `themeFromHue`, so what the admin sees
 * in the picker is not an approximation of the result — it IS the result. A
 * preview that merely resembles the outcome is how tenants end up surprised by
 * their own console.
 *
 * NOTHING HERE LETS SOMEONE BUILD A BAD THEME. There is no lightness slider and
 * no per-surface control: the recipe fixes every band, the only input is a hue,
 * and the accent's text colour is derived. The copy says so, because "you can't
 * pick anything unreadable" is a feature and reads as one only if stated.
 */
export function BrandingEditor({
  companyName,
  logoUrl,
  initialHue,
  initialRecipe,
}: {
  companyName: string;
  logoUrl: string | null;
  initialHue: string | null;
  initialRecipe: string | null;
}) {
  const [hue, setHue] = useState(
    isValidHex(initialHue) ? initialHue : PANAMEER_DEFAULT_HUE
  );
  const [recipeId, setRecipeId] = useState(
    RECIPES.some((r) => r.id === initialRecipe) ? (initialRecipe as string) : RECIPES[0].id
  );
  const [candidates, setCandidates] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tokens = themeFromHue(hue, recipeId);

  const scan = async (file: File) => {
    setScanning(true);
    setError(null);
    setCandidates([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/company/theme", { method: "POST", body: form });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error ?? "Could not read that image");
      const hues: string[] = body.hues ?? [];
      setCandidates(hues);
      /*
        The first candidate is SELECTED, not merely offered. The whole promise
        is "we found your colour" — making the admin click it again to confirm
        what the page just told them turns a result into a chore. Every other
        candidate stays one click away, and the hex field is always editable.
      */
      if (hues[0]) setHue(hues[0]);
      if (hues.length === 0) {
        setError(
          "No brand colour in that image — a black, white or greyscale logo has none to find. Type a hex below instead."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image");
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/company/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandHue: hue, recipeId }),
      });
      if (!r.ok) throw new Error((await r.json())?.error ?? "Could not save");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ---- 1. Your logo ------------------------------------------------- */}
      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[18px] font-bold">Your logo</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          We read your brand colour straight out of it. Nothing is saved by
          scanning — you confirm the colour below.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName}
              className="h-16 w-16 rounded-[10px] border border-line object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-[10px] border border-dashed border-line text-[18px] font-bold text-ink-2">
              {companyName.slice(0, 2).toUpperCase()}
            </span>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void scan(f);
            }}
          />
          <Button
            variant="ghost"
            disabled={scanning}
            onClick={() => fileRef.current?.click()}
          >
            {scanning ? "Reading your logo…" : "Read colours from an image"}
          </Button>
        </div>
      </section>

      {/* ---- 2. Your brand colour ----------------------------------------- */}
      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[18px] font-bold">Your brand colour</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          This is the only colour you choose. Everything else is derived from it.
        </p>

        {candidates.length > 0 && (
          <div className="mt-4">
            <p className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
              From your logo
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {candidates.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHue(c)}
                  aria-pressed={hue.toLowerCase() === c.toLowerCase()}
                  className={
                    "flex items-center gap-2.5 rounded-full border-[1.5px] px-3 py-1.5 text-[13.5px] font-semibold transition-colors " +
                    (hue.toLowerCase() === c.toLowerCase()
                      ? "border-magenta text-magenta"
                      : "border-line text-ink-2 hover:border-magenta/40")
                  }
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 rounded-full border border-black/10"
                    style={{ background: c }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold">Hex</span>
            <input
              value={hue}
              onChange={(e) => {
                /*
                  Accept partial input while typing — "#d1" is on the way to a
                  valid hex, and rejecting it keystroke-by-keystroke makes the
                  field impossible to edit. Validity is enforced on Save and
                  again server-side; this only bounds the length.
                */
                setSaved(false);
                setHue(e.target.value.slice(0, 7));
              }}
              spellCheck={false}
              className="w-[120px] rounded-[10px] border border-line px-3 py-2 font-mono text-[14px] outline-none focus:border-magenta"
            />
          </label>
          <span
            aria-hidden
            className="h-9 w-9 rounded-[8px] border border-black/10"
            style={{ background: isValidHex(hue) ? hue : "transparent" }}
          />
          {!isValidHex(hue) && (
            <span className="text-[13px] text-red-700">Needs to be #rrggbb.</span>
          )}
        </div>
      </section>

      {/* ---- 3. The recipe picker ------------------------------------------ */}
      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[18px] font-bold">Pick a theme</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          The structure is fixed — your colour makes it yours. You can&apos;t
          pick anything unreadable.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECIPES.map((r) => {
            const t = themeFromHue(isValidHex(hue) ? hue : PANAMEER_DEFAULT_HUE, r.id);
            const on = recipeId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRecipeId(r.id);
                  setSaved(false);
                }}
                aria-pressed={on}
                className={
                  "rounded-brand border-2 p-3 text-left transition-colors " +
                  (on ? "border-magenta" : "border-line hover:border-magenta/40")
                }
              >
                <MiniPreview tokens={t} />
                <p className="mt-2.5 text-[15px] font-bold">{r.label}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
                  {r.blurb}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- 4. Live preview ----------------------------------------------- */}
      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="text-[18px] font-bold">Preview</h2>
        <p className="mt-1 text-[14.5px] text-ink-2">
          This is the console your whole company will see.
        </p>
        <div className="mt-4 overflow-hidden rounded-brand border border-line">
          <div className="flex min-h-[220px]">
            <div className="w-[168px] shrink-0 p-3" style={{ background: tokens.surfaceDark }}>
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
                {companyName}
              </p>
              <div
                className="rounded-[8px] px-2.5 py-2 text-[13.5px] font-semibold"
                style={{ background: tokens.brandPrimary, color: tokens.brandPrimaryText }}
              >
                Active nav
              </div>
              <div className="mt-1 rounded-[8px] px-2.5 py-2 text-[13.5px] text-white/75">
                Inactive nav
              </div>
              <div className="mt-1 rounded-[8px] px-2.5 py-2 text-[13.5px] text-white/75">
                Another item
              </div>
            </div>
            <div className="flex-1 p-5" style={{ background: tokens.surfaceLight }}>
              <div className="rounded-brand border border-black/[0.07] bg-white p-4">
                <p className="text-[15px] font-bold text-ink">A card on the canvas</p>
                <p className="mt-1 text-[13.5px] text-ink-2">
                  Body copy sits on the page canvas.
                </p>
                <span
                  className="mt-3 inline-flex rounded-full px-4 py-2 text-[13.5px] font-bold"
                  style={{ background: tokens.brandPrimary, color: tokens.brandPrimaryText }}
                >
                  Primary button
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-[10px] bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={save} disabled={saving || !isValidHex(hue)}>
          {saving ? "Saving…" : "Save theme"}
        </Button>
        {saved && (
          <span className="text-[14px] font-semibold text-emerald-700">
            ✓ Saved — everyone at {companyName} sees this now.
          </span>
        )}
        <Button
          variant="quiet"
          onClick={() => {
            setHue(PANAMEER_DEFAULT_HUE);
            setRecipeId(RECIPES[0].id);
            setSaved(false);
          }}
        >
          Reset to Panameer default
        </Button>
      </div>
    </div>
  );
}

/** The swatch inside a recipe card — the same three surfaces, in miniature. */
function MiniPreview({ tokens }: { tokens: ThemeTokens }) {
  return (
    <div className="flex h-[64px] overflow-hidden rounded-[8px] border border-black/10">
      <div className="w-1/3" style={{ background: tokens.surfaceDark }} />
      <div className="relative flex-1" style={{ background: tokens.surfaceLight }}>
        <span
          className="absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] font-bold"
          style={{ background: tokens.brandPrimary, color: tokens.brandPrimaryText }}
        >
          Aa
        </span>
      </div>
    </div>
  );
}
