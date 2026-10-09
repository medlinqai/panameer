import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/notification-categories";
import { getTriage, getTriageCounts, countWorklist } from "@/lib/worklist";
import { NotificationList, type Chip } from "@/components/notifications/NotificationList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · Panameer" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; after?: string }>;
}) {
  const viewer = await guardPage("authenticated");
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;

  const sp = await searchParams;
  const filter = sp.filter ?? "all";

  const [{ rows, more }, counts, openCount] = await Promise.all([
    getTriage(person.id, { filter, cursor: sp.after }),
    getTriageCounts(person.id),
    countWorklist(person.id),
  ]);

  const chips: Chip[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "unread", label: "Unread", n: counts.unread },
    ...counts.byCategory.map((c) => ({
      key: c.key,
      label: findCategory(c.key)?.label ?? c.key,
      n: c.n,
    })),
  ];

  return (
    <div className="account-surface px-4 py-6 sm:px-6">
      <NotificationList
        rows={rows.map((r) => ({ ...r, at: r.at.toISOString() }))}
        chips={chips}
        filter={filter}
        more={more}
        openCount={openCount}
        unreadCount={counts.unread}
        // eslint-disable-next-line react-hooks/purity
        now={Date.now()}
      />
    </div>
  );
}
