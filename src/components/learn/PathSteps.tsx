"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotifyMe } from "@/components/learn/NotifyMe";

type Props = {
  pathId: string;
  slug: string;
  signedIn: boolean;
  enrolled: boolean;
  /** 1 Enroll · 2 Watch · 3 Finish · 4 Test; 5 = certified (all done). */
  at: 1 | 2 | 3 | 4 | 5;
  watchHref: string | null;
  watchLabel: string;
  done: number;
  total: number;
  test: { ready: boolean; passed: boolean; watching: boolean };
  certificateHref: string | null;
};

const BTN = "mt-2 inline-flex min-h-9 items-center border border-ink px-3 text-[12.5px] font-semibold hover:bg-surface-hover disabled:opacity-40";
const BTN_K = "mt-2 inline-flex min-h-9 items-center bg-ink px-3 text-[12.5px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";

// L-E052: the path's four steps, current one highlighted — Enroll → Watch the Courses → Finish → Take the Test & Get Certified.
export function PathSteps(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const enroll = async () => {
    if (!p.signedIn) return router.push(`/login?callbackUrl=${encodeURIComponent(`/learn/${p.slug}`)}`);
    setBusy(true);
    await fetch("/api/learn/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathId: p.pathId }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  const steps = [
    { n: 1, title: "Enroll", body: p.enrolled ? <p className="text-[12.5px] text-ink-2">Enrolled ✓</p> : <button type="button" disabled={busy} onClick={enroll} data-enroll className={BTN_K}>{busy ? "Enrolling…" : "Enroll"}</button> },
    { n: 2, title: "Watch the Courses", body: p.watchHref ? <Link href={p.watchHref} className={p.at === 2 ? BTN_K : BTN}>{p.watchLabel}</Link> : <p className="text-[12.5px] text-ink-2">{p.done} of {p.total} watched</p> },
    { n: 3, title: "Finish", body: <p className="text-[12.5px] text-ink-2">{p.at >= 4 ? "Ready to Test ✓" : `${p.done} of ${p.total} lessons`}</p> },
    {
      n: 4,
      title: "Take the Test & Get Certified",
      body: p.test.passed ? (
        p.certificateHref ? <Link href={p.certificateHref} className={BTN}>Passed · View Certificate</Link> : <p className="text-[12.5px] font-bold">Passed ✓</p>
      ) : p.test.ready ? (
        <Link href={p.signedIn ? `/learn/${p.slug}/test` : `/login?callbackUrl=${encodeURIComponent(`/learn/${p.slug}/test`)}`} className={p.at === 4 ? BTN_K : BTN}>Take the Test</Link>
      ) : (
        <NotifyMe pathId={p.pathId} initial={p.test.watching} signedIn={p.signedIn} test label="Test Opens Soon · Notify Me" className={BTN + " bg-surface text-ink"} />
      ),
    },
  ];
  return (
    <ol data-path-steps className="mt-5 grid gap-px border border-line bg-line sm:grid-cols-4">
      {steps.map((s) => {
        const state = s.n < p.at ? "done" : s.n === p.at ? "now" : "todo";
        return (
          <li key={s.n} data-step={s.n} data-state={state} aria-current={state === "now" ? "step" : undefined} className={"min-w-0 bg-white p-3 " + (state === "now" ? "shadow-[inset_0_3px_0_var(--color-magenta)]" : "")}>
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] " + (state === "done" ? "bg-ink text-surface" : state === "now" ? "bg-magenta text-white" : "border-2 border-[#C9CDDC] text-ink-3")}>{state === "done" ? "✓" : s.n}</span>
              <span className={state === "todo" ? "text-ink-2" : ""}>{s.title}</span>
            </p>
            {s.body}
          </li>
        );
      })}
    </ol>
  );
}
