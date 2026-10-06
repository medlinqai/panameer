import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { pathForUser } from "@/lib/your-path";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Path · Panameer" };

// Your Path: the six steps from sign-up to getting paid, with "You are here" and one Next button.
export default async function YourPathPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fyour-path");
  const { as } = await searchParams;
  const path = await pathForUser(viewer.userId, as === "buyer" || as === "provider" ? as : undefined);
  if (!path) redirect("/dashboard");
  const { steps, done, current, role } = path;
  const next = steps[current];
  const other = role === "provider" ? "buyer" : "provider";
  return (
    <div className="pm-white-page mx-auto w-full max-w-[860px] pb-14" data-your-path={role} data-current={current + 1}>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">YOUR PATH{current < 6 ? ` · STEP ${current + 1} OF 6` : ""}</p>
      <h1 className="mt-1.5 text-[30px] font-bold leading-tight">From sign-up to getting paid</h1>
      <p className="mt-1.5 max-w-[62ch] text-[14.5px] text-ink-2">
        Six steps. Each one unlocks something. You can learn, post and send proposals long before you need company paperwork.
      </p>
      <ol className="mt-6 border-t border-line">
        {steps.map((s, i) => {
          const here = i === current;
          return (
            <li key={s.key} data-step={s.key} data-done={done[i] || undefined} data-here={here || undefined} className={"grid grid-cols-[36px_1fr] gap-3 border-b border-line py-4 sm:grid-cols-[36px_1fr_auto] " + (here ? "bg-magenta/5" : "")}>
              <span className={"grid h-8 w-8 place-items-center text-[14px] font-bold " + (done[i] ? "bg-ink text-surface" : here ? "border-2 border-ink" : "border border-line text-ink-3")}>
                {done[i] ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold tracking-[0.1em] text-ink-3">STEP {i + 1}</span>
                <b className="block text-[16px]">
                  {s.title} {s.locked && <span aria-label="Admins only">🔒</span>}
                </b>
                <span className="block text-[13.5px] text-ink-2">{s.desc}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">Unlocks: {s.unlocks}</span>
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
        <p data-path-done className="mt-6 border-l-2 border-ink py-2 pl-3 text-[15px] font-bold">✓ {role === "provider" ? "Ready to be paid" : "Ready to buy and sign work"}</p>
      )}
      <p className="mt-6 text-[13.5px] text-ink-2">
        {role === "provider" ? "Buying instead?" : "Selling instead?"}{" "}
        <Link href={`/your-path?as=${other}`} className="font-semibold text-magenta-dark underline underline-offset-2">
          See the {other} path
        </Link>
      </p>
    </div>
  );
}
