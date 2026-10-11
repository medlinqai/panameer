import Link from "next/link";
import { RANGES, TABS, usageCtx, type Range, type Tab } from "@/lib/admin-usage/core";
import type { Lists } from "@/lib/admin-usage/lists";
import { PageTabs } from "@/components/casing/PageTabs";
import { DataTable } from "@/components/admin/usage/parts";
import { Overview, overviewLists } from "@/components/admin/usage/sections/overview";
import { Register, registerLists } from "@/components/admin/usage/sections/register";
import { Profile, profileLists } from "@/components/admin/usage/sections/profile";
import { Connect, connectLists } from "@/components/admin/usage/sections/connect";
import { Learn, learnLists } from "@/components/admin/usage/sections/learn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usage · Admin · Panameer" };

const LABEL: Record<Tab, string> = { overview: "Overview", register: "Register", profile: "Profile", connect: "Connect", learn: "Learn", work: "Work", shop: "Shop", orders: "Orders", pay: "Pay" };

// A-E002..E010: Admin › Usage — Overview plus one analytics tab per application. Admin-only (the /admin layout guards it).
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; range?: string; test?: string; app?: string; list?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "overview";
  const range: Range = (["7", "30", "90", "all"] as const).includes(sp.range as Range) ? (sp.range as Range) : "30";
  const includeTest = sp.test === "1";
  const c = await usageCtx(range, includeTest, tab);
  const q = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ tab, range, ...(includeTest ? { test: "1" } : {}) });
    for (const [k, v] of Object.entries(patch)) if (v == null) p.delete(k); else p.set(k, v);
    return `/admin/usage?${p.toString()}`;
  };
  const body = await section(tab, c, sp.app);
  const lists = sp.list ? await listsFor(tab, c) : null;
  const list = sp.list && lists?.[sp.list] ? await lists[sp.list]() : null;
  return (
    <div className="mx-auto w-full max-w-6xl" data-admin-usage>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">ADMIN</p>
      <h1 className="text-[28px] font-bold">Usage</h1>
      <PageTabs wrap tabs={TABS.map((t) => ({ label: LABEL[t], href: q({ tab: t, app: null, list: null }), match: t }))} current={tab} />
      <div className="mb-4 flex flex-wrap items-center gap-2" data-usage-filters>
        {RANGES.map((r) => <Link key={r.value} href={q({ range: r.value, list: null })} className={"border px-3 py-1.5 text-[13px] font-semibold " + (r.value === range ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>{r.label}</Link>)}
        <Link href={q({ test: includeTest ? null : "1", list: null })} className="ml-2 inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <span aria-hidden className={"grid h-4 w-4 place-items-center border " + (includeTest ? "border-ink bg-ink text-[10px] text-surface" : "border-line")}>{includeTest ? "✓" : ""}</span>
          Include test accounts
        </Link>
      </div>
      {list && (
        <div className="mb-4">
          <DataTable id="list" title={list.title} subtitle={`${list.rows.length} rows`} head={list.head} rows={list.rows} />
          <Link href={q({ list: null })} className="mt-1 inline-block text-[12.5px] font-semibold underline">Close list</Link>
        </div>
      )}
      {body}
    </div>
  );
}

async function section(tab: Tab, c: Awaited<ReturnType<typeof usageCtx>>, app?: string) {
  switch (tab) {
    case "overview": return <Overview c={c} app={app} />;
    case "register": return <Register c={c} />;
    case "profile": return <Profile c={c} />;
    case "connect": return <Connect c={c} />;
    case "learn": return <Learn c={c} />;
    default: return <p className="text-[14px] text-ink-2">Coming next.</p>;
  }
}

async function listsFor(tab: Tab, c: Awaited<ReturnType<typeof usageCtx>>): Promise<Lists> {
  switch (tab) {
    case "overview": return overviewLists(c);
    case "register": return registerLists(c);
    case "profile": return profileLists(c);
    case "connect": return connectLists(c);
    case "learn": return learnLists(c);
    default: return {};
  }
}
