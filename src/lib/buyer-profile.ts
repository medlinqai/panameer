import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractText, ExtractError } from "@/lib/resume/extract";
import { readDocument } from "@/lib/resume/import";

// Buyer Profile (2026-10-07): real-looking, optional, never a gate. Buyer fields only — no rates, roles or skill scoring.
export type WorkItem = { employer: string; title: string | null; start: string | null; end: string | null };
export type EduItem = { institution: string; degree: string | null; year: number | null };
export type BuyerProfileView = {
  personId: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  company: { id: string; name: string } | null;
  location: string | null;
  overview: string | null;
  workHistory: WorkItem[];
  education: EduItem[];
  languages: string[];
  looksComplete: boolean;
  missing: string[];
};

export async function buyerProfileFor(personId: string): Promise<BuyerProfileView | null> {
  const p = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true, first_name: true, last_name: true, title: true, photo_url: true,
      company: { select: { id: true, name: true } },
      site: { select: { addresses: { select: { city: true, state: true, country: true }, take: 1 } } },
      requesterProfile: { select: { overview: true, work_history: true, education: true, languages: true } },
    },
  });
  if (!p) return null;
  const a = p.site?.addresses[0];
  const rp = p.requesterProfile;
  const view = {
    personId: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
    title: p.title,
    photoUrl: p.photo_url,
    company: p.company ? { id: p.company.id, name: p.company.name } : null,
    location: a ? [a.city, a.state, a.country].filter(Boolean).join(", ") || null : null,
    overview: rp?.overview ?? null,
    workHistory: ((rp?.work_history ?? []) as WorkItem[]) ?? [],
    education: ((rp?.education ?? []) as EduItem[]) ?? [],
    languages: rp?.languages ?? [],
  };
  // The light hint: photo + title + company + overview. Never blocks anything.
  const missing = [!view.photoUrl && "a photo", !view.title?.trim() && "a title", !view.company && "your company", !view.overview?.trim() && "a short overview"].filter((x): x is string => !!x);
  return { ...view, looksComplete: missing.length === 0, missing };
}

export type BuyerProfileInput = { title?: string | null; overview?: string | null; workHistory?: WorkItem[]; education?: EduItem[]; languages?: string[] };

export async function saveBuyerProfile(personId: string, p: BuyerProfileInput) {
  if (p.title !== undefined) await prisma.person.update({ where: { id: personId }, data: { title: p.title?.trim().slice(0, 200) || null } });
  const data = {
    ...(p.overview !== undefined ? { overview: p.overview?.trim().slice(0, 4000) || null } : {}),
    ...(p.workHistory ? { work_history: p.workHistory.filter((w) => w.employer?.trim()).slice(0, 30) as unknown as Prisma.InputJsonValue } : {}),
    ...(p.education ? { education: p.education.filter((e) => e.institution?.trim()).slice(0, 20) as unknown as Prisma.InputJsonValue } : {}),
    ...(p.languages ? { languages: [...new Map(p.languages.map((l) => l.trim()).filter(Boolean).map((l) => [l.toLowerCase(), l] as const)).values()].slice(0, 20) } : {}),
  };
  if (Object.keys(data).length) await prisma.requesterProfile.upsert({ where: { person_id: personId }, create: { person_id: personId, ...data }, update: data });
}

/** "Fill from résumé": the same read providers get, mapped to buyer fields. Fills empty title/overview; replaces the lists. */
export async function fillBuyerFromResume(personId: string, file: { bytes: Buffer; mimeType: string; fileName: string }) {
  let text: string;
  try {
    text = await extractText(file.bytes, file.mimeType, file.fileName);
  } catch (e) {
    return { ok: false as const, error: e instanceof ExtractError ? e.message : "We couldn't read that file." };
  }
  const { parsed } = await readDocument(text, Date.now());
  const cur = await buyerProfileFor(personId);
  const workHistory: WorkItem[] = parsed.experiences.filter((x) => x.employer).map((x) => ({ employer: x.employer!, title: x.roleTitle || null, start: x.startDate, end: x.isCurrent ? null : x.endDate }));
  const education: EduItem[] = parsed.education.map((e) => ({ institution: e.institution, degree: [e.degree, e.field].filter(Boolean).join(", ") || null, year: e.endYear }));
  await saveBuyerProfile(personId, {
    ...(!cur?.title?.trim() && parsed.headline ? { title: parsed.headline } : {}),
    ...(!cur?.overview?.trim() && parsed.overview ? { overview: parsed.overview } : {}),
    ...(workHistory.length ? { workHistory } : {}),
    ...(education.length ? { education } : {}),
    ...(parsed.languages.length ? { languages: [...(cur?.languages ?? []), ...parsed.languages] } : {}),
  });
  return { ok: true as const, found: { jobs: workHistory.length, schools: education.length, languages: parsed.languages.length, title: !!parsed.headline, overview: !!parsed.overview } };
}
