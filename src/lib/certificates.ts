import { prisma } from "@/lib/prisma";

// L-E056..L-E060: one read of a Panameer-issued certificate, for the card, the image, the verify page and My Certificates.
export type CertificateView = {
  credentialId: string;
  title: string;
  holder: string;
  photoUrl: string | null;
  userId: string;
  issuedOn: Date;
  score: number | null;
  correct: number | null;
  total: number | null;
  path: { slug: string; title: string; published: boolean; courses: string[]; teacher: string | null } | null;
  profileId: string | null;
};

export async function certificateView(credentialId: string): Promise<CertificateView | null> {
  const c = await prisma.certification.findFirst({
    where: { credential_id: credentialId, issued_from: "LEARN" },
    select: {
      name: true, issued_on: true, created_at: true, credential_id: true, user_id: true, learning_path_id: true,
      user: { select: { person: { select: { first_name: true, last_name: true, photo_url: true } } } },
      providerProfile: { select: { id: true } },
      learningPath: { select: { slug: true, title: true, status: true, expert: { select: { first_name: true, last_name: true } }, courses: { orderBy: { sort_order: "asc" }, select: { title: true } } } },
    },
  });
  if (!c?.credential_id) return null;
  const best = c.learning_path_id
    ? await prisma.certificationAttempt.findFirst({ where: { user_id: c.user_id, learning_path_id: c.learning_path_id, passed: true, is_preview: false }, orderBy: { score: "desc" }, select: { score: true, answers: true } })
    : null;
  const total = best && best.answers && typeof best.answers === "object" ? Object.keys(best.answers as object).length : null;
  const p = c.user.person;
  const lp = c.learningPath;
  return {
    credentialId: c.credential_id,
    title: lp?.title ?? c.name,
    holder: `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "A Panameer member",
    photoUrl: p?.photo_url ?? null,
    userId: c.user_id,
    issuedOn: c.issued_on ?? c.created_at,
    score: best?.score ?? null,
    correct: best && total ? Math.round((best.score / 100) * total) : null,
    total,
    path: lp ? { slug: lp.slug, title: lp.title, published: lp.status === "PUBLISHED", courses: lp.courses.map((x) => x.title.replace(/^\s*\d+(\.\d+)*[.)]?\s*[-–]?\s*/, "")), teacher: lp.expert ? `${lp.expert.first_name ?? ""} ${lp.expert.last_name ?? ""}`.trim() : null } : null,
    profileId: c.providerProfile?.id ?? null,
  };
}

/** A member's Panameer certificates, newest first. */
export async function myCertificates(userId: string): Promise<CertificateView[]> {
  const rows = await prisma.certification.findMany({ where: { user_id: userId, issued_from: "LEARN", credential_id: { not: null } }, orderBy: { created_at: "desc" }, select: { credential_id: true } });
  return (await Promise.all(rows.map((r) => certificateView(r.credential_id!)))).filter((x): x is CertificateView => !!x);
}
