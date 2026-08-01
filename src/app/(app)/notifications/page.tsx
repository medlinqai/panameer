import { guardPage } from "@/lib/guard";

/**
 * Notifications (MASTER WS10 element 7) — UI ported, FEED STUBBED.
 *
 * The brief scopes the notifications BACKEND out, so this is deliberately an
 * empty state rather than invented rows: the header bell also carries no count,
 * because a "0" badge asserts something we haven't checked and a fake number is
 * worse than none.
 */
export default async function Page() {
  await guardPage("authenticated");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
        Notifications
      </h1>
      <div className="mt-5 rounded-brand border border-line bg-white p-8 text-center">
        <p className="text-[16px] font-bold">Nothing yet.</p>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
          When buyers respond to your applications, or a contract needs your
          attention, it will show up here.
        </p>
      </div>
    </div>
  );
}
