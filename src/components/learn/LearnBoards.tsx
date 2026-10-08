import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { BoardRow } from "@/lib/learn-homepage";

// Learn Home boards: Top Learners | Top Teachers, split by one rule. Under 3 people → dashed "Be the first" spots.
function Switch({ param, value, other }: { param: string; value: "month" | "all"; other: string }) {
  const href = (v: "month" | "all") => `/learn?${new URLSearchParams({ ...(other ? Object.fromEntries(new URLSearchParams(other)) : {}), ...(v === "all" ? { [param]: "all" } : {}) }).toString()}`.replace(/\?$/, "");
  const cls = (on: boolean) => "-mb-px border-b-2 px-2.5 py-1.5 text-[13px] font-bold " + (on ? "border-magenta text-magenta" : "border-transparent text-ink-3 hover:text-ink");
  return (
    <nav className="mt-1 flex gap-1 border-b border-line">
      <Link href={href("month")} className={cls(value === "month")}>This Month</Link>
      <Link href={href("all")} className={cls(value === "all")}>All Time</Link>
    </nav>
  );
}

function Board({ rows, meUserId, empty, unit }: { rows: BoardRow[]; meUserId: string; empty: string; unit: string }) {
  const spots = Math.max(0, 3 - rows.length);
  return (
    <ol className="mt-1">
      {rows.map((r, i) => {
        const me = r.userId === meUserId;
        const [first, ...rest] = r.name.split(" ");
        return (
          <li key={r.personId} data-me={me || undefined} className={"flex items-center justify-between gap-2.5 border-b border-line py-2.5 text-[13.5px] " + (me ? "border-l-[3px] border-l-magenta bg-bg-soft pl-2 font-bold" : "")}>
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 flex-none tabular-nums text-ink-3">{i + 1}</span>
              <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={r.photoUrl} size={30} />
              <span className="min-w-0">
                <span className="block truncate">{r.name}{me ? " (you)" : ""}</span>
                {(r.sub ?? r.title) && <span className="block truncate text-[12px] font-normal text-ink-3">{r.sub ?? r.title}</span>}
              </span>
            </span>
            <span className="flex-none tabular-nums" title={unit}>{r.n}</span>
          </li>
        );
      })}
      {Array.from({ length: spots }, (_, k) => (
        <li key={`spot-${k}`} data-empty-spot className="flex items-center justify-between gap-2.5 border-b border-line py-2.5 text-[13px] text-ink-3">
          <span className="flex items-center gap-2.5">
            <span className="w-5 flex-none tabular-nums">{rows.length + k + 1}</span>
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-dashed border-[#C9CDDC]">+</span>
            {empty}
          </span>
          <span>—</span>
        </li>
      ))}
    </ol>
  );
}

export function LearnBoards({ learners, teachers, lb, tb, meUserId, createHref }: { learners: BoardRow[]; teachers: BoardRow[]; lb: "month" | "all"; tb: "month" | "all"; meUserId: string; createHref: string }) {
  return (
    <div className="grid md:grid-cols-2">
      <section data-top-learners className="min-w-0 py-6 md:pr-7">
        <h2 className="text-[20px] font-bold">Top Learners <small className="ml-1 text-[12px] font-medium text-ink-3">certificates earned</small></h2>
        <Switch param="lb" value={lb} other={tb === "all" ? "tb=all" : ""} />
        <Board rows={learners} meUserId={meUserId} empty="Be the first to take this spot" unit="certificates" />
      </section>
      <section data-top-teachers className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
        <h2 className="text-[20px] font-bold">Top Teachers <small className="ml-1 text-[12px] font-medium text-ink-3">learners {tb === "month" ? "this month" : "all time"}</small></h2>
        <Switch param="tb" value={tb} other={lb === "all" ? "lb=all" : ""} />
        <Board rows={teachers} meUserId={meUserId} empty="Teach what you know — publish a learning path" unit="learners" />
        <Link href={createHref} className="mt-4 inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold hover:bg-surface-hover">Create a Learning Path</Link>
      </section>
    </div>
  );
}
