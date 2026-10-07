import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { lifecycleForUser } from "@/lib/your-path";
import { LIFECYCLE_WHO } from "@/lib/user-levels";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";
import { RoadGraphic } from "@/components/lifecycle/RoadGraphic";
import { LifecycleStrip } from "@/components/lifecycle/LifecycleStrip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Path · Panameer" };

// Your Path: the road (9 stops for providers, 7 for buyers) with "You are here" and one Next button.
export default async function YourPathPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fyour-path");
  const path = await lifecycleForUser(viewer.userId);
  if (!path) redirect("/dashboard");
  const { steps, done, current, status, road } = path;
  const total = steps.length;
  const next = steps[current];
  return (
    <div className={"pm-white-page mx-auto w-full pb-14 " + (road === "provider" ? "max-w-[1120px]" : "max-w-[860px]")} data-your-path data-current={current + 1} data-status={status}>
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-magenta">
        YOUR PATH{current < total ? ` · STEP ${current + 1} OF ${total}` : ""} · {status.toUpperCase()}
        <LifecycleHelp className="text-ink" />
      </p>
      <h1 className="mt-1.5 text-[30px] font-bold leading-tight">From account to getting paid</h1>
      {road === "provider" ? (
        <>
          <p className="mt-1.5 max-w-[780px] text-[14.5px] text-ink-2">
            Nine stops. You can sell before any company paperwork — that comes right before your first work order. Panameer contracts with and pays companies, not individuals.
          </p>
          <div className="mt-4 overflow-x-auto"><div className="min-w-[640px]"><RoadGraphic current={current} /></div></div>
          <Link href="/join/provider/road" data-detailed-road-link className="mt-2 inline-block text-[13.5px] font-bold text-magenta-dark underline underline-offset-4">
            See the detailed road (offers, work requests, interviews) →
          </Link>
        </>
      ) : (
        <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-ink-2">
          Buyers follow seven steps. You do the first four; your company does the rest. Panameer contracts with and pays companies, not individuals.
        </p>
      )}
      <div className="mt-6"><LifecycleStrip current={current} /></div>
      <ol className="mt-8 border-t border-line">
        {steps.map((s, i) => {
          const here = i === current;
          return (
            <li key={s.key} data-step={i + 1} data-done={done[i] || undefined} data-here={here || undefined} className={"grid grid-cols-[36px_1fr] gap-3 border-b border-line py-4 sm:grid-cols-[36px_1fr_auto] " + (here ? "bg-magenta/5" : "")}>
              <span className={"grid h-8 w-8 place-items-center text-[14px] font-bold " + (done[i] ? "bg-ink text-surface" : here ? "border-2 border-ink" : "border border-line text-ink-3")}>
                {done[i] ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-3">
                  STEP {i + 1}
                  {s.gate && <span className="border border-ink px-1 text-[9.5px] text-ink">GATE</span>}
                  <span className="px-1.5 text-[10px]" style={{ background: LIFECYCLE_WHO[s.who].bg, color: LIFECYCLE_WHO[s.who].fg }}>{LIFECYCLE_WHO[s.who].label.toUpperCase()}</span>
                </span>
                <b className="block text-[16px]">{s.step}</b>
                <span className="block text-[13.5px] text-ink-2">{s.desc}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">
                  Status after it: <b className="text-ink-2">{s.status}</b>
                  {s.unlocks && ` · Unlocks ${s.unlocks}`}
                </span>
              </span>
              <span className="col-start-2 self-center sm:col-start-3">
                {done[i] ? (
                  <span className="text-[12.5px] font-bold text-[#1f8a5b]">✓ Done</span>
                ) : here ? (
                  <span className="border border-ink px-2 py-0.5 text-[11px] font-bold tracking-[0.06em]">YOU ARE HERE</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {next ? (
        <div data-path-next className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-ink p-4">
          <span>
            <b className="block text-[15px]">Next: {next.next}</b>
            <span className="text-[13.5px] text-ink-2">{next.desc}</span>
          </span>
          <Link href={next.href} className="inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">
            Do Step {current + 1}
          </Link>
        </div>
      ) : (
        <p data-path-done className="mt-6 border-l-2 border-ink py-2 pl-3 text-[15px] font-bold">✓ Paid — every step is done</p>
      )}
    </div>
  );
}
