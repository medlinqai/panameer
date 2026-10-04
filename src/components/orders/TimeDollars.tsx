import { formatCents } from "@/lib/display";
import type { WoMoney } from "@/lib/wo-money";

// Board 1/3 header: Time | Dollars, two open columns with thin lines. Unknowns read "not set", never a fake zero.
export function TimeDollars({ m, currency }: { m: WoMoney; currency: string }) {
  const pct = (n: number) => (m.capCents > 0 ? Math.min(100, (n / m.capCents) * 100) : 0);
  const hoursPct = m.hoursAuthorized ? Math.min(100, (m.hoursLogged / m.hoursAuthorized) * 100) : 0;
  return (
    <section data-testid="time-dollars" className="grid grid-cols-2 border-y border-line">
      <div className="min-w-0 py-5 pr-3 md:pr-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-2">TIME</p>
        <p className="mt-1 text-[24px] font-semibold leading-none md:text-[34px]">
          {m.hoursLogged}
          <span className="mt-1 block text-[12px] font-normal text-ink-2 md:ml-2 md:mt-0 md:inline md:text-[14px]">
            {m.hoursAuthorized == null ? "hours logged · no hourly lines" : `of ${m.hoursAuthorized} hours`}
          </span>
        </p>
        <div className="mt-3 h-2 w-full bg-ink/[0.07]" aria-hidden>
          <div className="h-full bg-ink" style={{ width: `${hoursPct}%` }} />
        </div>
        <p className="mt-2 text-[12px] text-ink-2 md:text-[13px]">
          {m.periodStart ?? "Start not set"} → {m.periodEnd ?? "end not set"}
          {m.daysLeft != null && <> · <b className="text-ink">{m.daysLeft} day{m.daysLeft === 1 ? "" : "s"} left</b></>}
          {m.hoursLeft != null && <> · {m.hoursLeft} hours left</>}
        </p>
      </div>
      <div className="min-w-0 border-l border-line py-5 pl-3 md:pl-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-2">DOLLARS</p>
        <p className="mt-1 text-[24px] font-semibold leading-none md:text-[34px]">
          {formatCents(m.leftToPayCents, currency)}
          <span className="mt-1 block text-[12px] font-normal text-ink-2 md:ml-2 md:mt-0 md:inline md:text-[14px]">left to be paid of {formatCents(m.capCents, currency)}</span>
        </p>
        <div className="mt-3 flex h-2 w-full bg-ink/[0.07]" aria-hidden>
          <div className="h-full bg-ink" style={{ width: `${pct(m.paidCents)}%` }} />
          <div className="h-full bg-ink/45" style={{ width: `${pct(m.approvedUnpaidCents)}%` }} />
          <div className="h-full bg-magenta" style={{ width: `${pct(m.awaitingApprovalCents)}%` }} />
        </div>
        <p className="mt-2 flex flex-col gap-x-3 text-[12px] text-ink-2 md:flex-row md:flex-wrap md:text-[13px]">
          <span><i className="mr-1 inline-block h-2 w-2 bg-ink align-middle" />Paid {formatCents(m.paidCents, currency)}</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-ink/45 align-middle" />Approved, not yet paid {formatCents(m.approvedUnpaidCents, currency)}</span>
          <span><i className="mr-1 inline-block h-2 w-2 bg-magenta align-middle" />Awaiting approval {formatCents(m.awaitingApprovalCents, currency)}</span>
        </p>
      </div>
    </section>
  );
}
