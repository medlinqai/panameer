import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { listPaths, listGroups, createPath, LearnAdminError } from "@/lib/learn-admin";

const AUDIENCES = ["BEGINNERS", "END_USER", "IMPLEMENTER", "CONTENT_CREATOR"] as const;

/**
 * The write shape, validated before it reaches Prisma.
 *
 * `audience` is an enum in the database, so an unrecognised string would come
 * back as an opaque Prisma error the admin can do nothing with; naming the
 * allowed values here turns that into a message that says what's wrong.
 */
export const PATH_BODY = z.object({
  title: z.string().trim().min(1, "A learning path needs a title."),
  slug: z.string().trim().optional().nullable(),
  summary: z.string().trim().max(2000).optional().nullable(),
  audience: z.enum(AUDIENCES),
  group: z.string().trim().max(120).optional().nullable(),
  expertPersonId: z.string().uuid().optional().nullable(),
  coverImage: z.string().trim().max(2000).optional().nullable(),
  introVideoRef: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

/** GET /api/admin/learn/paths — every path with rollups, plus group suggestions. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  try {
    const [paths, groups] = await Promise.all([listPaths(), listGroups()]);
    return NextResponse.json({ paths, groups });
  } catch (e) {
    console.error("[admin/learn] list paths failed:", e);
    return NextResponse.json({ error: "Could not load learning paths" }, { status: 500 });
  }
}

/** POST /api/admin/learn/paths — create one. */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const parsed = PATH_BODY.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "That isn't a valid learning path." },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json({ ok: true, path: await createPath(parsed.data) });
  } catch (e) {
    if (e instanceof LearnAdminError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("[admin/learn] create path failed:", e);
    return NextResponse.json({ error: "Could not create that path" }, { status: 500 });
  }
}
