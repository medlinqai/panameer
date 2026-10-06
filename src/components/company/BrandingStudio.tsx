"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanySection } from "@/components/company/CompanySection";
import { CompanyLogoUpload } from "@/components/company/CompanyLogoUpload";
import { LOOKS, brandTokens, contrastChecks, DEFAULT_BRAND, MIN_CONTRAST, normalizeLook, type LookId } from "@/lib/dynamic-branding";
import { contrast } from "@/lib/themeRecipes";
import { CompanyLogoTile } from "@/components/company/CompanyLogoTile";

// Branding (mockup company_tabs 2026-10-05): Usage/Health layout — hero, then Brand Color · Dynamic Branding · Where It Shows.
type Props = { companyId: string; companyName: string; logoUrl: string | null; brandHue: string | null; themeRecipe: string | null; themeEnabled: boolean | null; palette: string[] };

export function BrandingStudio({ companyId, companyName, logoUrl, brandHue, themeRecipe, themeEnabled, palette: savedPalette }: Props) {
  const router = useRouter();
  const saved = { hue: brandHue, look: normalizeLook(themeRecipe) };
  const [hue, setHue] = useState(brandHue ?? DEFAULT_BRAND);
  const [hexDraft, setHexDraft] = useState(brandHue ?? DEFAULT_BRAND);
  const [look, setLook] = useState<LookId>(saved.look ?? "ink");
  const [palette, setPalette] = useState<string[]>(savedPalette);
  const savedKey = savedPalette.join(",");
  // A new logo upload refreshes the page; show the colors read from it.
  useEffect(() => setPalette(savedKey ? savedKey.split(",") : []), [savedKey]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const scanInput = useRef<HTMLInputElement>(null);

  const valid = /^#[0-9a-f]{6}$/i.test(hue);
  const t = useMemo(() => brandTokens(valid ? hue : DEFAULT_BRAND, look), [hue, look, valid]);
  const checks = useMemo(() => contrastChecks(t), [t]);
  const readable = valid && checks.every((c) => c.ok);
  // On = the company's console uses the saved look (null = saved before the switch: on when a look exists).
  const themed = !!saved.hue && !!saved.look && themeEnabled !== false;
  // One brand color on the page: the color being edited (saved brand_hue until changed). Hero, stat,
  // swatches, looks, preview and Where It Shows all read this; Save makes it the console's.
  const shown = valid ? hue.toLowerCase() : DEFAULT_BRAND;
  const unsaved = valid && hue.toLowerCase() !== (saved.hue ?? DEFAULT_BRAND).toLowerCase();

  const scan = async (file: File | undefined) => {
    if (!file) return;
    setBusy("scan");
    setMsg(null);
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/company/theme", { method: "POST", body: form }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { hues?: string[]; palette?: string[]; error?: string } | undefined;
    setBusy(null);
    if (scanInput.current) scanInput.current.value = "";
    if (!r?.ok) return setMsg({ ok: false, text: b?.error ?? "Could not read that image." });
    const found = b?.palette?.length ? b.palette : (b?.hues ?? []);
    setPalette(found);
    if (found[0]) {
      setHue(found[0]);
      setHexDraft(found[0]);
    } else setMsg({ ok: false, text: "No brand color in that image — a black, white or gray logo has none to find. Type a hex instead." });
  };
  const put = async (body: { brandHue: string | null; recipeId: string | null; enabled?: boolean }, label: string) => {
    setBusy(label);
    setMsg(null);
    const r = await fetch("/api/company/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(null);
    if (!r?.ok) return setMsg({ ok: false, text: b?.error ?? "That didn't save." });
    setMsg({
      ok: true,
      text: !body.brandHue
        ? "Back to the Panameer default."
        : body.enabled === false
          ? "Dynamic Branding is off. Everyone at the company sees Panameer's default console."
          : body.enabled === true || themed
            ? "Saved. Everyone at the company sees this theme now."
            : "Saved. Turn Dynamic Branding on to apply it.",
    });
    if (!body.brandHue) {
      setHue(DEFAULT_BRAND);
      setHexDraft(DEFAULT_BRAND);
      setLook("ink");
    }
    router.refresh();
  };

  const BTN = "min-h-[42px] px-[18px] text-[13px] font-bold disabled:opacity-50";
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-branding>
      <section className="grid items-center gap-x-14 gap-y-6 border-b border-line pb-9 md:grid-cols-[340px_1fr]">
        <div className="flex items-center justify-center gap-5">
          <div className="grid h-[150px] w-[220px] place-items-center border border-line bg-surface text-center" data-logo-box>
            {logoUrl ? (
              <CompanyLogoTile src={logoUrl} alt={`${companyName} logo`} className="h-full w-full" pad="8%" />
            ) : (
              <span className="text-[12.5px] text-ink-3">No logo yet</span>
            )}
          </div>
          <div className="text-center">
            <span className="block h-[52px] w-[52px] border border-line" style={{ background: shown }} data-brand-color={shown} aria-hidden />
            <span className="mt-1.5 block font-mono text-[11.5px] uppercase text-ink-2"><span data-brand-hex>{shown}</span></span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">BRANDING</p>
          <h1 className="mb-5 mt-1.5 text-[30px] font-bold leading-tight">How {companyName} Looks to Buyers</h1>
          <div className="flex flex-wrap gap-x-11 gap-y-3 border-b border-line pb-[18px]">
            <div>
              <b className="block text-[26px] font-medium">{logoUrl ? "✓" : "—"}</b>
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">LOGO</span>
            </div>
            <div>
              <b className="block h-[32px] w-[32px] border border-line" style={{ background: shown }} data-brand-color={shown} aria-hidden />
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">BRAND COLOR</span>
            </div>
            <div>
              <b className="block text-[26px] font-medium">3</b>
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">PLACES IT SHOWS</span>
            </div>
          </div>
          <p className="my-[18px] text-[14px] leading-[1.65] text-ink-2">
            Your logo and color show on your company page, proposals and work orders.{" "}
            {logoUrl ? "Read your colors from the logo, or type one below." : "Upload a logo and we'll suggest the color from it."}
          </p>
          <div className="flex flex-wrap gap-2">
            <CompanyLogoUpload companyId={companyId} currentUrl={logoUrl} label="Upload Logo" className={`${BTN} bg-ink text-surface hover:bg-ink-hover`} />
            <button type="button" onClick={() => scanInput.current?.click()} disabled={busy === "scan"} className={`${BTN} border border-ink bg-surface text-ink`}>
              {busy === "scan" ? "Reading Your Image…" : "Read Colors From an Image"}
            </button>
            <input ref={scanInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => scan(e.target.files?.[0])} data-scan-input />
          </div>
        </div>
      </section>

      <CompanySection id="brand-color" title="Brand Color">
        <p className="mt-2 text-[14px] text-ink-2">The one color you choose. We keep text readable on it.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="h-[42px] w-[42px] border border-line" style={{ background: valid ? hue : "transparent" }} aria-hidden />
          <input
            value={hexDraft}
            onChange={(e) => {
              setHexDraft(e.target.value);
              const v = e.target.value.trim();
              if (/^#?[0-9a-f]{6}$/i.test(v)) setHue(v.startsWith("#") ? v : `#${v}`);
            }}
            aria-label="Brand color hex"
            name="hex"
            className="min-h-[42px] w-[130px] border border-line bg-surface px-3 font-mono text-[14px] focus:border-ink focus:outline-none"
          />
          <input type="color" value={valid ? hue : DEFAULT_BRAND} onChange={(e) => { setHue(e.target.value); setHexDraft(e.target.value); }} aria-label="Pick a color" className="h-[42px] w-[42px] cursor-pointer border border-line bg-surface p-0.5" />

        </div>
      </CompanySection>

      <CompanySection
        id="dynamic-branding"
        title="Dynamic Branding"
        actions={
          <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink">
            {themed ? "On" : "Off"}
            <button
              type="button"
              role="switch"
              aria-checked={themed}
              aria-label="Dynamic Branding"
              data-theme-switch
              disabled={!!busy || (!themed && !readable)}
              onClick={() => put({ brandHue: shown, recipeId: look, enabled: !themed }, "switch")}
              className={"relative h-[22px] w-[40px] border border-ink transition-colors disabled:opacity-50 " + (themed ? "bg-ink" : "bg-surface")}
            >
              <span className={"absolute top-[3px] h-[14px] w-[14px] transition-all " + (themed ? "left-[21px] bg-surface" : "left-[3px] bg-ink")} />
            </button>
          </span>
        }
      >
        <p className="mt-2 max-w-[66ch] text-[14px] text-ink-2">
          Your brand color themes the Panameer console for everyone at {companyName}. Pick a look — Panameer keeps every combination readable.
        </p>
        {palette.length > 0 && (
          <div className="mt-4" data-logo-palette>
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Colors from your logo</p>
            <div className="flex flex-wrap gap-3">
              {palette.map((c) => {
                const inUse = valid && c.toLowerCase() === hue.toLowerCase();
                const onWhite = contrast(c, "#ffffff") >= MIN_CONTRAST;
                const onInk = contrast(c, "#1f2937") >= MIN_CONTRAST;
                return (
                  <button
                    key={c}
                    type="button"
                    data-swatch={c}
                    data-in-use={inUse ? "true" : undefined}
                    aria-pressed={inUse}
                    onClick={() => {
                      setHue(c);
                      setHexDraft(c);
                    }}
                    className={"w-[92px] p-1.5 text-left " + (inUse ? "border-2 border-ink" : "border border-line")}
                  >
                    <span className="block h-[56px] w-full" style={{ background: c }} aria-hidden />
                    <span className="mt-1 block font-mono text-[11.5px] uppercase">{c}</span>
                    <span className="block text-[10.5px] text-ink-2" data-contrast-white={onWhite}>
                      {onWhite ? "✓" : "✕"} white text
                    </span>
                    <span className="block text-[10.5px] text-ink-2" data-contrast-ink={onInk}>
                      {onInk ? "✓" : "✕"} ink text
                    </span>
                    {inUse && <span className="mt-0.5 block text-[10.5px] font-bold text-ink">✓ In use</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:max-w-[520px]" role="radiogroup" aria-label="Look">
          {LOOKS.map((l) => {
            const lt = brandTokens(valid ? hue : DEFAULT_BRAND, l.id);
            const on = look === l.id;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-look={l.id}
                onClick={() => setLook(l.id)}
                className={"border p-2 text-left " + (on ? "border-ink" : "border-line")}
              >
                <span className="block aspect-square border border-line bg-white">
                  <span className="block h-[22%]" style={{ background: lt.rail }} />
                  <span className="mx-[12%] mt-[14%] block h-[10%] w-[50%]" style={{ background: lt.brand }} />
                  <span className="mx-[12%] mt-[8%] block h-[4%] w-[70%] bg-line" />
                  <span className="mx-[12%] mt-[6%] block h-[4%] w-[55%] bg-line" />
                </span>
                <span className="mt-1.5 block text-[12.5px] font-semibold">
                  {l.label} {on && "✓"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border border-line" data-theme-preview aria-label="Preview">
          <div className="flex items-center gap-4 px-4 py-2.5" style={{ background: t.rail, color: t.railText }}>
            <b className="text-[14px]">Panameer</b>
            <span className="px-2.5 py-1 text-[12px] font-semibold" style={{ background: t.railActive, color: "#fff" }}>Work</span>
            <span className="text-[12px] opacity-80">Learn</span>
            <span className="text-[12px] opacity-80">Shop</span>
          </div>
          <div className="space-y-3 bg-white px-4 py-4 text-[#272334]">
            <p className="text-[13.5px]">
              A work order from {companyName}. <a className="font-semibold underline" style={{ color: t.link }}>View the proposal</a>
            </p>
            <div className="flex gap-2 border-t border-[#e9e6ef] pt-3">
              <span className="px-4 py-2 text-[13px] font-bold" style={{ background: t.brand, color: t.brandText }}>Primary Action</span>
              <span className="border border-[#272334] px-4 py-2 text-[13px] font-bold">Secondary</span>
            </div>
          </div>
        </div>
        <ul className="mt-3 grid gap-1 text-[12.5px] sm:grid-cols-2" data-contrast>
          {checks.map((c) => (
            <li key={c.pair} data-ok={c.ok} className={c.ok ? "text-ink-2" : "font-semibold text-magenta-dark"}>
              {c.ok ? "✓" : "✗"} {c.pair} · {c.ratio}:1
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-ink-3">
          The band, active menu item, primary buttons and links take your color; buttons stay square; text contrast is checked (4.5:1) before it can be saved.
        </p>
        {msg && <p role="status" data-theme-msg className={"mt-2 text-[13px] font-semibold " + (msg.ok ? "text-ink" : "text-magenta-dark")}>{msg.text}</p>}
        {!themed && (
          <p data-preview-only className="mt-3 border-l-2 border-magenta py-1.5 pl-3 text-[13px] text-ink">
            Preview only — turn on to apply to everyone at {companyName}.
          </p>
        )}
        {unsaved && <p data-unsaved className="mt-2 text-[12.5px] font-semibold text-ink">Not saved yet — Save Theme to apply {shown} for everyone.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!readable || !!busy} onClick={() => put({ brandHue: hue.toLowerCase(), recipeId: look }, "save")} className={`${BTN} bg-ink text-surface hover:bg-ink-hover`}>
            {busy === "save" ? "Saving…" : "Save Theme"}
          </button>
          <button type="button" disabled={!!busy || !themed} onClick={() => put({ brandHue: null, recipeId: null }, "reset")} className={`${BTN} border border-ink bg-surface text-ink`}>
            Reset to Panameer Default
          </button>
        </div>
      </CompanySection>

      <CompanySection id="where-it-shows" title="Where It Shows">
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            [companyName, "Company page"],
            [`Proposal · ${companyName}`, "Proposals you send"],
            [`WO-1042 · ${companyName}`, "Work orders & invoices"],
          ].map(([sample, where]) => (
            <div key={where} className="border-t border-line pt-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold">
                <span className="h-3 w-3" style={{ background: shown }} data-brand-color={shown} aria-hidden />
                {sample}
              </span>
              <span className="text-[13px] text-ink-2">{where}</span>
            </div>
          ))}
        </div>
      </CompanySection>
    </div>
  );
}
