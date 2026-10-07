"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanySection } from "@/components/company/CompanySection";
import { CompanyLogoUpload, CropLogoToSquare } from "@/components/company/CompanyLogoUpload";
import { CompanyLogoTile } from "@/components/company/CompanyLogoTile";
import { LOOKS, brandTokens, DEFAULT_BRAND, normalizeLook, type LookId } from "@/lib/dynamic-branding";

// Branding v3: one upload (colors read from it), one brand color, a switch that saves on click and never blocks.
type Props = { companyId: string; companyName: string; logoUrl: string | null; brandHue: string | null; themeRecipe: string | null; themeEnabled: boolean | null; palette: string[] };
type Put = { brandHue: string | null; recipeId: string | null; enabled?: boolean };

export function BrandingStudio({ companyId, companyName, logoUrl, brandHue, themeRecipe, themeEnabled, palette }: Props) {
  const router = useRouter();
  const savedLook = normalizeLook(themeRecipe);
  const [hue, setHue] = useState<string | null>(brandHue?.toLowerCase() ?? palette[0]?.toLowerCase() ?? null);
  const [look, setLook] = useState<LookId>(savedLook ?? "ink");
  const [on, setOn] = useState(!!brandHue && !!savedLook && themeEnabled !== false);
  // No brand color yet → "On" would just show Panameer magenta, so the switch waits for a color.
  const noColor = !hue || hue === DEFAULT_BRAND.toLowerCase();
  const [custom, setCustom] = useState(false);
  const [hexDraft, setHexDraft] = useState(brandHue ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const color = hue ?? DEFAULT_BRAND;
  const t = useMemo(() => brandTokens(color, look), [color, look]);
  const inPalette = !!hue && palette.some((c) => c.toLowerCase() === hue);

  const put = async (body: Put) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/company/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) {
      setMsg({ ok: false, text: b?.error ?? "That didn't save." });
      return false;
    }
    router.refresh();
    return true;
  };
  const pick = async (c: string) => {
    const was = hue;
    setHue(c.toLowerCase());
    if (!(await put({ brandHue: c.toLowerCase(), recipeId: look, enabled: on }))) setHue(was);
  };
  const toggle = async () => {
    const next = !on;
    setOn(next);
    if (!(await put({ brandHue: color, recipeId: look, enabled: next }))) setOn(!next);
  };
  const pickLook = async (l: LookId) => {
    setLook(l);
    if (on) await put({ brandHue: color, recipeId: l, enabled: true });
  };
  const reset = async () => {
    if (await put({ brandHue: null, recipeId: null })) {
      setHue(null);
      setOn(false);
      setLook("ink");
      setHexDraft("");
    }
  };

  const BTN = "min-h-[42px] px-[18px] text-[13px] font-bold disabled:opacity-50";
  const draftOk = /^#?[0-9a-f]{6}$/i.test(hexDraft.trim());
  const customInUse = !!hue && !inPalette;
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-branding>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">BRANDING</p>
      <h1 className="mt-1.5 text-[30px] font-bold leading-tight">How {companyName} Looks</h1>
      <p className="mt-1.5 text-[14px] font-semibold" data-hero-status={on ? "on" : "off"}>
        Dynamic Branding: {on ? "On" : "Off"}
      </p>

      <CompanySection id="logo" title="1 · Logo">
        <div className="mt-3 flex flex-wrap items-start gap-5">
          <div>
            <div className="grid h-[150px] w-[260px] max-w-full place-items-center border border-line bg-surface" data-logo-box>
              {logoUrl ? <CompanyLogoTile src={logoUrl} alt={`${companyName} logo`} className="h-full w-full" pad="8%" /> : <span className="text-[12.5px] text-ink-3">No logo yet</span>}
            </div>
            {logoUrl && (
              <div className="mt-1.5 text-right">
                <CropLogoToSquare companyId={companyId} currentUrl={logoUrl} className="text-[12px] font-semibold text-magenta-dark underline" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CompanyLogoUpload companyId={companyId} currentUrl={logoUrl} quiet label={logoUrl ? "Replace Logo" : "Upload Logo"} className={`${BTN} bg-ink text-surface hover:bg-ink-hover`} />
            <p className="mt-2 text-[13px] text-ink-2">Best: 600 × 200 px, PNG or SVG, white or transparent background. We read your colors from it.</p>
          </div>
        </div>
      </CompanySection>

      <CompanySection id="brand-color" title="2 · Brand Color">
        <p className="mt-2 text-[14px] text-ink-2">Click a color to use it.</p>
        {logoUrl && palette.length === 0 && (
          <p data-no-palette className="mt-2 border-l-2 border-ink py-1 pl-3 text-[13.5px]">No brand color in this logo — pick Custom.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3" data-logo-palette>
          {palette.map((c) => {
            const inUse = hue === c.toLowerCase();
            return (
              <button key={c} type="button" data-swatch={c.toLowerCase()} data-in-use={inUse || undefined} aria-pressed={inUse} disabled={busy} onClick={() => pick(c)} className={"w-[96px] p-1.5 text-left " + (inUse ? "border-2 border-ink" : "border border-line")}>
                <span className="block h-[56px] w-full" style={{ background: c }} aria-hidden />
                <span className="mt-1 block font-mono text-[11.5px] uppercase">{c}</span>
                {inUse && <span className="block text-[11px] font-bold">✓ In use</span>}
              </button>
            );
          })}
          <button type="button" data-swatch-custom data-in-use={customInUse || undefined} onClick={() => setCustom(!custom)} className={"w-[96px] p-1.5 text-left " + (customInUse ? "border-2 border-ink" : "border border-dashed border-line")}>
            <span className="grid h-[56px] w-full place-items-center text-[13px] font-semibold" style={customInUse ? { background: hue! } : undefined}>
              {customInUse ? "" : "Custom…"}
            </span>
            <span className="mt-1 block font-mono text-[11.5px] uppercase">{customInUse ? hue : "Custom"}</span>
            {customInUse && <span className="block text-[11px] font-bold">✓ In use</span>}
          </button>
        </div>
        {custom && (
          <div className="mt-3 flex flex-wrap items-center gap-2" data-custom-hex>
            <input value={hexDraft} onChange={(e) => setHexDraft(e.target.value)} placeholder="#1b97c4" aria-label="Brand color hex" name="hex" className="min-h-[42px] w-[140px] border border-line bg-surface px-3 font-mono text-[14px] focus:border-ink focus:outline-none" />
            <button type="button" disabled={!draftOk || busy} onClick={() => pick(hexDraft.trim().startsWith("#") ? hexDraft.trim() : `#${hexDraft.trim()}`)} className={`${BTN} bg-ink text-surface`}>
              Use Color
            </button>
          </div>
        )}
      </CompanySection>

      <CompanySection
        id="dynamic-branding"
        title="3 · Dynamic Branding"
        actions={
          <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
            <span data-switch-label>{noColor ? "Pick a brand color first" : on ? `On — everyone at ${companyName} sees this` : "Off — Panameer default"}</span>
            <button type="button" role="switch" aria-checked={on} aria-label="Dynamic Branding" data-theme-switch disabled={busy || noColor} onClick={toggle} className={"relative h-[22px] w-[40px] shrink-0 border border-ink transition-colors disabled:opacity-50 " + (on ? "bg-ink" : "bg-surface")}>
              <span className={"absolute top-[3px] h-[14px] w-[14px] transition-all " + (on ? "left-[21px] bg-surface" : "left-[3px] bg-ink")} />
            </button>
          </span>
        }
      >
        <p className="mt-2 max-w-[66ch] text-[14px] text-ink-2">Themes the Panameer console for everyone at {companyName}. Saves when you click.</p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-[520px]" role="radiogroup" aria-label="Look">
          {LOOKS.map((l) => {
            const lt = brandTokens(color, l.id);
            const sel = look === l.id;
            return (
              <button key={l.id} type="button" role="radio" aria-checked={sel} data-look={l.id} disabled={busy} onClick={() => pickLook(l.id)} className={"border p-2 text-left " + (sel ? "border-ink" : "border-line")}>
                <span className="block aspect-square border border-line bg-white">
                  <span className="block h-[22%]" style={{ background: lt.rail }} data-look-rail />
                  <span className="mx-[12%] mt-[14%] block h-[10%] w-[50%]" style={{ background: lt.brand }} data-look-brand />
                  <span className="mx-[12%] mt-[8%] block h-[4%] w-[70%] bg-line" />
                  <span className="mx-[12%] mt-[6%] block h-[4%] w-[55%] bg-line" />
                </span>
                <span className="mt-1.5 block text-[12.5px] font-semibold">
                  {l.label} {sel && "✓"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 border border-line" data-theme-preview aria-label="Preview">
          <div className="flex items-center gap-4 px-4 py-2.5" style={{ background: t.rail, color: t.railText }} data-preview-band>
            <b className="text-[14px]">Panameer</b>
            <span className="px-2.5 py-1 text-[12px] font-semibold" style={{ background: t.railActive, color: "#fff" }} data-preview-active>Work</span>
            <span className="text-[12px]">Learn</span>
            <span className="text-[12px]">Shop</span>
          </div>
          <div className="space-y-3 bg-white px-4 py-4 text-[#272334]">
            <p className="text-[13.5px]">
              A work order from {companyName}. <a className="font-semibold underline" style={{ color: t.link }} data-preview-link>View the proposal</a>
            </p>
            <span className="inline-block px-4 py-2 text-[13px] font-bold" style={{ background: t.brand, color: t.brandText }} data-preview-primary>Primary Action</span>
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-ink-3">Text contrast is adjusted automatically (4.5:1).</p>
        {msg && <p role="status" data-theme-msg className={"mt-2 text-[13px] font-semibold " + (msg.ok ? "text-ink" : "text-magenta-dark")}>{msg.text}</p>}
        <button type="button" data-theme-reset disabled={busy} onClick={reset} className="mt-3 text-[13px] font-semibold text-magenta-dark underline">
          Reset to Panameer Default
        </button>
      </CompanySection>

      <CompanySection id="where-it-shows" title="Where It Shows">
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="border-t border-line pt-3">
            <dt className="text-[14px] font-semibold">Your logo and brand color</dt>
            <dd className="text-[13.5px] text-ink-2">Show to buyers on your company page, proposals, work orders and invoices.</dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="text-[14px] font-semibold">Dynamic Branding ({on ? "On" : "Off"})</dt>
            <dd className="text-[13.5px] text-ink-2">Themes the Panameer console for everyone at {companyName}: top band, menus, tabs, buttons, links.</dd>
          </div>
        </dl>
      </CompanySection>
    </div>
  );
}
