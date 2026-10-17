// Scott 10-17: "anything to make it easier" — a Word résumé with a headshot fills the profile photo.
// Only when the person has no photo yet, only .docx, and only when the AI check says it's one adult person.
import { prisma } from "@/lib/prisma";
import { photoIsSurelyPerson } from "@/lib/photo-check";
import { uploadProfilePhoto } from "@/lib/storage";
import { applyProviderSection } from "@/lib/onboarding";

export async function photoFromResume(profileId: string, bytes: Buffer, mimeType: string, fileName: string): Promise<boolean> {
  try {
    const isDocx = /\.docx$/i.test(fileName) || mimeType.includes("wordprocessingml");
    if (!isDocx) return false;
    const profile = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { person: { select: { id: true, photo_url: true } } } });
    const person = profile?.person;
    if (!person || person.photo_url) return false;
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(bytes);
    const media = Object.values(zip.files).filter((f) => !f.dir && /^word\/media\/.+\.(png|jpe?g)$/i.test(f.name));
    const files = await Promise.all(media.map(async (f) => ({ name: f.name, buf: await f.async("nodebuffer") })));
    const sharp = (await import("sharp")).default;
    const candidates: Buffer[] = [];
    for (const f of files.sort((a, b) => b.buf.length - a.buf.length)) {
      if (f.buf.length < 6_000 || f.buf.length > 5_000_000) continue;
      const m = await sharp(f.buf).metadata().catch(() => null);
      if (!m?.width || !m?.height || m.width < 120 || m.height < 120) continue;
      const ratio = m.width / m.height;
      if (ratio < 0.6 || ratio > 1.5) continue; // headshots are roughly square or portrait; logos/banners aren't
      candidates.push(f.buf);
      if (candidates.length >= 3) break;
    }
    for (const buf of candidates) {
      const jpg = await sharp(buf).rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      const ab = jpg.buffer.slice(jpg.byteOffset, jpg.byteOffset + jpg.byteLength) as ArrayBuffer;
      if (!(await photoIsSurelyPerson(ab, "image/jpeg"))) continue;
      const photoUrl = await uploadProfilePhoto(person.id, { type: "image/jpeg", size: jpg.byteLength, bytes: ab });
      await applyProviderSection(profileId, person.id, "photo", { photoUrl });
      return true;
    }
    return false;
  } catch (e) {
    console.warn("[resume] photo skipped:", (e as Error).message);
    return false;
  }
}
