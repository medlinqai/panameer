import { prisma } from "@/lib/prisma";
import { learnCatalog } from "@/lib/learn-catalog";
import { recommendNext } from "@/lib/learn-next";
import type { AttentionItem, AttentionLine } from "@/lib/attention";

// WK-E008: Learn's Things You Need to Do lines (Continue · Certificates · Matched to You), written into the Worklist by appCounts.
export async function learnLines(userId: string, providerProfileId: string | null): Promise<AttentionItem[]> {
  const catalog = await learnCatalog(userId);
  const inProgress = catalog.filter((p) => p.mine?.enrolled && p.mine.done > 0 && p.mine.done < p.mine.total);
  const earned = catalog.filter((p) => p.certificate);
  const onProfile = providerProfileId ? new Set((await prisma.credential.findMany({ where: { provider_profile_id: providerProfileId, learning_path_id: { not: null } }, select: { learning_path_id: true } })).map((c) => c.learning_path_id)) : null;
  const ready = catalog.filter((p) => p.tag === "READY_TO_TEST");
  const matched = (await recommendNext(userId, { paths: catalog, limit: 5 })).picks.filter((p) => !p.path.mine?.enrolled);
  const group = (title: string, lines: AttentionLine[], href: string): AttentionItem[] => (lines.length ? [{ id: `learn:${title}`, title, n: lines.length, what: title, app: "learn", appLabel: "Learn", due: null, dueAt: null, href, action: "Open", lines }] : []);
  return [
    ...group("Continue", inProgress.map((p) => ({ key: p.id, what: p.title, detail: `Lesson ${(p.mine?.done ?? 0) + 1} of ${p.mine?.total ?? 0}`, dueAt: null, href: p.mine?.next ? `/learn/${p.slug}/${p.mine.next.id}` : `/learn/${p.slug}`, action: "Resume" })), "/learn/my"),
    ...group("Certificates", [
      ...(onProfile ? earned.filter((p) => !onProfile.has(p.id)).map((p) => ({ key: `c-${p.id}`, what: `Add ${p.title} to Your Profile`, detail: `Earned ${p.certificate!.earnedOn}`, dueAt: null, href: "/learn/certificates", action: "Add" })) : []),
      ...ready.map((p) => ({ key: `t-${p.id}`, what: `Take the ${p.title} Test`, detail: "You finished the path", dueAt: null, href: `/learn/${p.slug}/test`, action: "Start" })),
    ], "/learn/certificates"),
    ...group("Matched to You", matched.map((m) => ({ key: m.path.id, what: m.path.title, detail: m.reason, dueAt: null, href: `/learn/${m.path.slug}`, action: "Enroll" })), "/learn/paths"),
  ];
}
