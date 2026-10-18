import type { HelpLinkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// SH2-E008: beginner links on /help, opened inside Panameer where the source allows it.
export const HELP_TYPES: { value: HelpLinkType; label: string }[] = [
  { value: "VIDEO", label: "Video" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WORD", label: "Word" },
  { value: "PDF", label: "PDF" },
  { value: "WEB_PAGE", label: "Web page" },
];

export const listHelpLinks = (all = false) =>
  prisma.helpLink.findMany({ where: all ? {} : { active: true }, orderBy: [{ sort: "asc" }, { created_at: "asc" }] });

export const getHelpLink = (id: string) => prisma.helpLink.findFirst({ where: { id, active: true } });

/** A YouTube watch / short / youtu.be URL → its embed URL (null when it isn't one). */
function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    const id = host === "youtu.be" ? u.pathname.slice(1) : host === "youtube.com" ? u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1] ?? null : null;
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Does the site let itself be shown in a frame? Read from its headers; unknown counts as no. */
async function framable(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(4000), headers: { "User-Agent": "Mozilla/5.0 Panameer-Help" } });
    const xfo = r.headers.get("x-frame-options")?.toLowerCase() ?? "";
    const csp = r.headers.get("content-security-policy")?.toLowerCase() ?? "";
    void r.body?.cancel();
    if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
    const fa = csp.match(/frame-ancestors([^;]*)/)?.[1]?.trim();
    if (fa && !fa.split(/\s+/).includes("*")) return false;
    return r.ok;
  } catch {
    return false;
  }
}

/** Where the viewer pane points — or null when it must open in a new tab (Instagram, sites that refuse frames). */
export async function viewerSrc(link: { type: HelpLinkType; url: string }): Promise<string | null> {
  switch (link.type) {
    case "VIDEO":
      return youtubeEmbed(link.url) ?? ((await framable(link.url)) ? link.url : null);
    case "WORD":
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(link.url)}`;
    case "PDF":
      // A PDF whose host refuses frames still shows inline through Google's embedded viewer.
      return (await framable(link.url)) ? link.url : `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(link.url)}`;
    case "WEB_PAGE":
      return (await framable(link.url)) ? link.url : null;
    case "INSTAGRAM":
      return null;
  }
}

export type HelpLinkInput = { title: string; description?: string | null; keywords?: string | null; type: HelpLinkType; url: string; active?: boolean };

export function cleanHelpLink(i: HelpLinkInput): HelpLinkInput {
  const title = i.title?.trim().slice(0, 120);
  if (!title) throw new Error("Give the link a title.");
  if (!HELP_TYPES.some((t) => t.value === i.type)) throw new Error("Pick a type.");
  let url: URL;
  try { url = new URL(i.url.trim()); } catch { throw new Error("That URL isn't valid."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use an http(s) link.");
  return { title, description: i.description?.trim().slice(0, 240) || null, keywords: i.keywords?.trim().slice(0, 300) || null, type: i.type, url: url.toString(), active: i.active ?? true };
}

export async function saveHelpLink(id: string | null, input: HelpLinkInput) {
  const data = cleanHelpLink(input);
  if (id) return prisma.helpLink.update({ where: { id }, data: { ...data, sample: false } });
  const last = await prisma.helpLink.findFirst({ orderBy: { sort: "desc" }, select: { sort: true } });
  return prisma.helpLink.create({ data: { ...data, sort: (last?.sort ?? 0) + 10 } });
}

/** Move one link up or down by swapping its sort with the neighbour. */
export async function moveHelpLink(id: string, dir: "up" | "down") {
  const all = await listHelpLinks(true);
  const i = all.findIndex((l) => l.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  await prisma.$transaction(all.map((l, k) => prisma.helpLink.update({ where: { id: l.id }, data: { sort: (k === i ? j : k === j ? i : k) * 10 + 10 } })));
}

export const setHelpLinkActive = (id: string, active: boolean) => prisma.helpLink.update({ where: { id }, data: { active } });

/** II-E002/E003: Informational Items a Shop search finds (title, description or keywords). */
export async function searchHelpLinks(q: string) {
  const words = q.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const rows = await listHelpLinks();
  const text = (r: (typeof rows)[number]) => [r.title, r.description ?? "", r.keywords ?? ""].join(" ").toLowerCase();
  const phrase = q.trim().toLowerCase();
  return rows.filter((r) => text(r).includes(phrase) || words.every((w) => text(r).includes(w)));
}
