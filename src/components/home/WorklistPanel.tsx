import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWorklist } from "@/lib/worklist";

export async function WorklistPanel({ userId }: { userId: string }) {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!person) return null;

  const items = await getWorklist(person.id, 5);
  if (items.length === 0) return null;

  return (
    <section className="mb-5 rounded-brand border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {}
        <h2 className="font-display text-[16px] font-bold">Waiting on You</h2>
        <Link
          href="/notifications"
          className="text-[13px] font-bold text-magenta hover:underline"
        >
          See All
        </Link>
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((n) => {
          const body = (
            <>
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[14px] font-semibold text-ink">{n.title}</span>
                {}
                {n.count > 1 && (
                  <span
                    data-worklist-count={n.count}
                    className="rounded-full bg-magenta/10 px-2 py-0.5 text-[11.5px] font-bold text-magenta"
                  >
                    {n.count} waiting
                  </span>
                )}
              </span>
              {n.body && (
                <span className="mt-0.5 block text-[13px] text-ink-2">{n.body}</span>
              )}
            </>
          );
          return (
            <li key={n.id}>
              {n.href ? (
                <Link
                  href={n.href}
                  className="block rounded-brand border border-line p-3 transition-colors hover:border-magenta"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-brand border border-line p-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
