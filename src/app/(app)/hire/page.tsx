import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { taxonomyV2 } from "@/lib/platform-settings";
import { BUDGET, HOW_LONG, HireTalentError, talentSupply, tellUsWhatYouNeed, WHERE } from "@/lib/hire-talent";
import { WorkRequestError } from "@/lib/work-request";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire Talent · Panameer" };

const FIELD = "border border-line bg-bg-soft px-2.5 py-2 text-[14px] text-ink";

// SH-E004: Tell us what you need (who · how long · budget · where) → a Work Request and its matches; below, who's available — masked.
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const { error } = await searchParams;
  const { who, groups } = await talentSupply(await seesTestAccounts(viewer));

  async function seeMatches(form: FormData) {
    "use server";
    const v = await guardPage("canHireTalent");
    let id: string;
    try {
      id = await tellUsWhatYouNeed(v, await seesTestAccounts(v), {
        who: String(form.get("who") ?? ""), other: String(form.get("other") ?? ""), howLong: String(form.get("howLong") ?? ""), budget: String(form.get("budget") ?? ""), where: String(form.get("where") ?? ""),
      });
    } catch (e) {
      if (e instanceof HireTalentError || e instanceof WorkRequestError) redirect(`/hire?error=${encodeURIComponent(e.message)}`);
      throw e;
    }
    redirect(`/work-requests/${id}`);
  }

  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <ShopTabs services={await taxonomyV2()} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-4 text-[26px] font-extrabold">Hire Talent</h1>
          <p className="text-[14px] text-ink-2">Who&apos;s available, without names. Tell us what you need and we&apos;ll match you — then you see who they are.</p>
        </div>
        <Link href="/hire/jobs" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">My Jobs →</Link>
      </div>

      <form action={seeMatches} className="mt-4 rounded-[10px] border-2 border-ink bg-white p-4" data-tell-us>
        <b className="text-[16px]">Tell us what you need</b>
        {error && <p role="alert" className="mt-2 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
        <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          <label className="flex flex-col gap-1 text-[12px] font-bold">
            Who
            <select name="who" className={FIELD} defaultValue={who[0] ?? "other"}>
              {who.map((w) => <option key={w} value={w}>{w}</option>)}
              <option value="other">Something else…</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold">
            How long
            <select name="howLong" className={FIELD} defaultValue="ONE_TO_3_MONTHS">
              {HOW_LONG.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold">
            Budget
            <select name="budget" className={FIELD} defaultValue="100to150">
              {BUDGET.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold">
            Where
            <select name="where" className={FIELD} defaultValue="either">
              {WHERE.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 flex flex-col gap-1 text-[12px] font-bold">
          Something else? Say who
          <input name="other" placeholder="e.g. Oracle Payroll lead for a UK rollout" className={FIELD} />
        </label>
        <button type="submit" className="mt-3.5 inline-flex min-h-10 w-full max-w-[360px] items-center justify-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">See my matches</button>
        <p className="mt-2 text-[12.5px] text-ink-3">This is your Work Request. You can add details later.</p>
      </form>

      <h2 className="mb-2.5 mt-7 text-[18px] font-bold">Available now</h2>
      {groups.length === 0 ? (
        <p className="text-[14px] text-ink-3">No talent is live yet — tell us what you need and we&apos;ll find them.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3" data-available-now>
          {groups.map((g) => (
            <div key={g.area} className="flex items-center gap-3 rounded-[10px] border border-line bg-white p-3.5" data-talent-group>
              <span aria-hidden className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-bg-soft text-ink-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
              </span>
              <div className="min-w-0">
                <p><span className="text-[22px] font-extrabold">{g.count}</span> <b>{g.area}</b></p>
                <p className="text-[12.5px] text-ink-2">{g.kinds}</p>
                <p className="text-[12px] text-ink-3">{g.rate ? `${g.rate} · ` : ""}names after you tell us what you need</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
