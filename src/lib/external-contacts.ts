import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// XA-E003: recruiter contacts on an external job — each with its own tracked link /r/{token}.
export async function addContact(jobId: string, input: { name?: string | null; linkedinUrl?: string | null; email?: string | null; source?: "CLIPPER" | "MANUAL" }) {
  const name = input.name?.trim().slice(0, 120) || null;
  const linkedin = input.linkedinUrl?.trim().split("?")[0].slice(0, 300) || null;
  const email = input.email?.trim().toLowerCase().slice(0, 200) || null;
  if (!name && !linkedin && !email) throw new Error("Give a name, a LinkedIn profile or an email.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That email doesn't look right.");
  // The same person clipped twice stays one contact.
  const same = await prisma.externalJobContact.findFirst({ where: { external_job_id: jobId, OR: [...(linkedin ? [{ linkedin_url: linkedin }] : []), ...(email ? [{ email }] : []), ...(name && !linkedin && !email ? [{ name }] : [])] }, select: { id: true } });
  if (same) return prisma.externalJobContact.update({ where: { id: same.id }, data: { ...(name ? { name } : {}), ...(linkedin ? { linkedin_url: linkedin } : {}), ...(email ? { email } : {}) } });
  return prisma.externalJobContact.create({ data: { external_job_id: jobId, name, linkedin_url: linkedin, email, source: input.source ?? "MANUAL", token: randomBytes(12).toString("base64url") } });
}

/** "{n} Oracle consultants have applied to your '{title}' role through Panameer (rates $min–$max/hr). See their profiles and rates: {link}" */
export function outreachMessage(n: number, title: string, rates: number[], link: string) {
  const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
  const range = rates.length ? ` (rates ${usd(Math.min(...rates))}–${usd(Math.max(...rates))}/hr)` : "";
  return `${n} Oracle consultant${n === 1 ? " has" : "s have"} applied to your '${title}' role through Panameer${range}. See their profiles and rates: ${link}`;
}
