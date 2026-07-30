import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { parseResume } from "@/lib/resume/parse";
import { matchSkills, suggestableSkills } from "@/lib/resume/match";

/**
 * Dev-only raw-parse inspector (WS-C).
 *
 * The diagnostic that produced this brief was assembled by guessing backwards
 * from a summary — "40 of 52 kept" tells you a cap fired and nothing about WHY a
 * line became a skill. `raw_text` has been stored on every import since brief_Q;
 * this exposes it alongside each stage's output, so the next failure is read
 * rather than inferred.
 *
 * NOT USER-FACING, and gated three ways: the route 404s in production, the
 * viewer must be signed in, and the import is looked up through
 * `ownedProviderProfile` so one provider can never inspect another's résumé.
 * Someone's CV is the most personal document on the platform; a debug view of it
 * is not something to leave reachable by URL.
 *
 * GET /api/dev/parse-inspect            → the caller's most recent import
 * GET /api/dev/parse-inspect?id=<uuid>  → a specific one they own
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  const row = await prisma.profileImport.findFirst({
    where: {
      provider_profile_id: profile.id, // the ownership boundary
      ...(id ? { id } : {}),
    },
    orderBy: { created_at: "desc" },
  });
  if (!row) {
    return NextResponse.json({ error: "No import found" }, { status: 404 });
  }

  const text = row.raw_text ?? "";
  // Re-run the pure stages on the STORED text rather than reading the persisted
  // `parsed` blob: that way the inspector shows what the parser does TODAY, so a
  // fix can be checked against a real document without re-uploading it.
  const parsed = parseResume(text);
  const catalog = await prisma.skill.findMany({ select: { id: true, name: true } });
  const { matched, unmatched } = matchSkills(parsed.skills, catalog);

  return NextResponse.json({
    import: {
      id: row.id,
      fileName: row.file_name,
      mime: row.mime_type,
      bytes: row.size_bytes,
      status: row.status,
      createdAt: row.created_at,
    },
    extraction: {
      chars: text.length,
      lines: text ? text.split("\n").length : 0,
      // Enough to see the shape of the document without paging the whole thing.
      head: text.slice(0, 4000),
      truncated: text.length > 4000,
    },
    parsed: {
      headline: parsed.headline,
      overview: parsed.overview,
      experiences: parsed.experiences,
      education: parsed.education,
      languages: parsed.languages,
      skillTokens: parsed.skills,
      gaps: parsed.gaps,
    },
    skills: {
      matched: matched.map((m) => m.name),
      unmatched,
      suggested: suggestableSkills(unmatched),
      // The difference between these two is the filter's work, and it is the
      // number worth watching: dropped terms are the ones nobody ever sees.
      droppedBySuggestionFilter: unmatched.length - suggestableSkills(unmatched).length,
    },
  });
}
