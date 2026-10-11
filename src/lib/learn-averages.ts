import { cache } from "react";
import { prisma } from "@/lib/prisma";

// LT-E004: member averages for the You · Total · Average heroes — over members who have started (≥1 lesson, or ≥1 test
// attempt / certificate), so new sign-ups don't drag it down. Test accounts left out. Cached per request.
const realUsers = async (ids: string[]) =>
  new Set((await prisma.user.findMany({ where: { id: { in: ids }, is_test: false }, select: { id: true } })).map((u) => u.id));

export const memberLessonAverage = cache(async (): Promise<number> => {
  const rows = await prisma.lessonProgress.groupBy({ by: ["user_id"], _count: { _all: true } });
  const real = await realUsers(rows.map((r) => r.user_id));
  const counted = rows.filter((r) => real.has(r.user_id));
  return counted.length ? Math.round(counted.reduce((n, r) => n + r._count._all, 0) / counted.length) : 0;
});

export const memberCertificateAverage = cache(async (): Promise<number> => {
  const [attempts, certs] = await Promise.all([
    prisma.certificationAttempt.groupBy({ by: ["user_id"] }),
    prisma.credential.groupBy({ by: ["user_id"], where: { issued_from: "PANAMEER", learning_path_id: { not: null } }, _count: { _all: true } }),
  ]);
  const started = [...new Set([...attempts.map((a) => a.user_id), ...certs.map((c) => c.user_id)])];
  const real = await realUsers(started);
  const n = started.filter((u) => real.has(u)).length;
  const total = certs.filter((c) => real.has(c.user_id)).reduce((s, c) => s + c._count._all, 0);
  return n ? Math.round((total / n) * 10) / 10 : 0;
});
