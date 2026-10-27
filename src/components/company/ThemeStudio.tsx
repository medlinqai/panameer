"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_MAGENTA, BTN_OUT } from "@/components/hire/HireUI";

type T = { header: string; accent: string; background: string; logoUrl: string; backgroundUrl: string; approved: boolean };
const HEX = /^#[0-9a-f]{6}$/i;
const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border px-3 py-2 text-[14px]";

// WA-E005: Option A — a screenshot of your Oracle home page (we read the colours and the logo corner); Option B — enter them.
// Either way you see a live preview and approve it.
export function ThemeStudio({ initial }: { initial: T }) {
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (p: Partial<T>) => setT((x) => ({ ...x, ...p }));
  const header = HEX.test(t.header) ? t.header : "#272334", accent = HEX.test(t.accent) ? t.accent : "#d72cd6", bg = HEX.test(t.background) ? t.background : "#fafafa";

  const read = async (f: File) => {
    setBusy(true); setMsg(null);
    const fd = new FormData(); fd.set("file", f);
    const r = await fetch("/api/company/theme/extract", { method: "POST", body: fd }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { header?: string; accent?: string; background?: string; logoUrl?: string | null; error?: string };
    setBusy(false);
    if (!r?.ok) { setMsg(j.error ?? "We couldn't read that screenshot."); return; }
    set({ header: j.header ?? t.header, accent: j.accent ?? t.accent, background: j.background ?? t.background, ...(j.logoUrl ? { logoUrl: j.logoUrl } : {}) });
    setMsg("Colours read from your screenshot — check the preview, adjust if needed, then approve.");
  };
  const save = async () => {
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.set("header", t.header); fd.set("accent", t.accent); fd.set("background", t.background);
    if (logoFile) fd.set("logo", logoFile); else if (t.logoUrl) fd.set("logoUrl", t.logoUrl);
    if (bgFile) fd.set("backgroundImage", bgFile); else if (t.backgroundUrl) fd.set("backgroundUrl", t.backgroundUrl);
    const r = await fetch("/api/company/theme/yours", { method: "POST", body: fd }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setMsg(j.error ?? "Couldn't save the theme."); return; }
    set({ approved: true }); setMsg("Theme approved — your people see it now.");
    router.refresh();
  };
  const reset = async () => {
    setBusy(true);
    await fetch("/api/company/theme/yours", { method: "DELETE" }).catch(() => null);
    setBusy(false); set({ header: "", accent: "", background: "", backgroundUrl: "", approved: false }); setMsg("Back to Panameer's look."); router.refresh();
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]" data-theme-studio>
      <div className="space-y-6">
        <section className="rounded-[12px] border border-state-border p-4" data-theme-option="a">
          <h2 className="text-[16px] font-extrabold">Option A · Upload a Screenshot</h2>
          <p className="mt-1 text-[13px] text-ink-2">A screenshot of your Oracle home page. We read the header, accent and background colours and the logo corner.</p>
          <input type="file" accept="image/png,image/jpeg" disabled={busy} onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} className="mt-3 text-[13px]" data-theme-screenshot />
        </section>
        <section className="rounded-[12px] border border-state-border p-4" data-theme-option="b">
          <h2 className="text-[16px] font-extrabold">Option B · Enter Your Colours</h2>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {([["header", "Header"], ["accent", "Accent"], ["background", "Background"]] as const).map(([k, l]) => (
              <label key={k} className="text-[12.5px] font-semibold">{l}
                <span className="mt-1 flex items-center gap-1.5">
                  <input type="color" value={HEX.test(t[k]) ? t[k] : k === "header" ? "#272334" : k === "accent" ? "#d72cd6" : "#fafafa"} onChange={(e) => set({ [k]: e.target.value } as Partial<T>)} aria-label={`${l} colour`} className="h-9 w-9 shrink-0 cursor-pointer border border-state-border" />
                  <input value={t[k]} onChange={(e) => set({ [k]: e.target.value.trim() } as Partial<T>)} placeholder="#1F4E79" className={FIELD} data-theme-hex={k} />
                </span>
              </label>
            ))}
          </div>
          <label className="mt-3 block text-[12.5px] font-semibold">Logo (SVG or PNG)
            <input type="file" accept="image/svg+xml,image/png" onChange={(e) => { const f = e.target.files?.[0] ?? null; setLogoFile(f); if (f) set({ logoUrl: URL.createObjectURL(f) }); }} className="mt-1 block text-[13px]" />
          </label>
          <label className="mt-3 block text-[12.5px] font-semibold">Background Image (Optional)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0] ?? null; setBgFile(f); if (f) set({ backgroundUrl: URL.createObjectURL(f) }); }} className="mt-1 block text-[13px]" />
          </label>
        </section>
      </div>

      <div>
        <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3">LIVE PREVIEW</p>
        <div className="mt-2 overflow-hidden rounded-[12px] border border-state-border" style={{ background: bg, backgroundImage: t.backgroundUrl ? `url("${t.backgroundUrl}")` : undefined, backgroundSize: "cover" }} data-theme-preview>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: header }}>
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.logoUrl ? <img src={t.logoUrl} alt="" className="h-6 w-auto max-w-[140px] object-contain" /> : <b className="text-[14px]" style={{ color: "#fff" }}>Your Logo</b>}
              <span className="text-[10px] opacity-70" style={{ color: "#fff" }}>Powered by Panameer</span>
            </span>
            <span className="h-1 w-16 rounded" style={{ background: accent }} />
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-[10px] border border-state-border bg-white p-3">
              <b className="text-[14px]">Work</b>
              <p className="mt-1 text-[12.5px] text-ink-2">Jobs Matched <span className="font-bold" style={{ color: accent }}>3</span></p>
            </div>
            <button type="button" className="inline-flex min-h-9 items-center px-4 text-[13px] font-bold text-white" style={{ background: accent }}>Primary Button</button>
          </div>
        </div>
        {msg && <p role="status" className="mt-3 text-[13px] font-semibold">{msg}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !HEX.test(t.header) || !HEX.test(t.accent)} onClick={() => void save()} className={`${BTN_MAGENTA} disabled:opacity-40`} data-theme-approve>{t.approved ? "Save Changes" : "Approve Theme"}</button>
          {t.approved && <button type="button" disabled={busy} onClick={() => void reset()} className={BTN_OUT}>Use Panameer&apos;s Look</button>}
          <Link href="/company" className={BTN}>Back to Company</Link>
        </div>
      </div>
    </div>
  );
}
