import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";

/**
 * ── ⚠⚠ THE COLLEAGUES ROSTER (`P2-J3-E558` WS-A) ───────────────────────────
 *
 * ⚠⚠ THE PAGE IS A ROSTER, NOT A DIRECTORY. Scott, 2026-09-17: *"the search has
 * to be throttled based on class."*
 *
 * ⚠⚠⚠ THIS MODULE NEVER QUERIES ALL MEMBERS, AND THAT IS ITS WHOLE REASON TO
 * EXIST. `searchMembers` in `connections.ts` is member-wide and is the route
 * 145 providers take to reach 13 buyers. ⚠ THE SEARCH HERE FILTERS A LIST THE
 * VIEWER ALREADY HAS — accepted colleagues — so there is no query that could
 * reach a stranger even if the filter were wrong.
 *
 * ⚠ `USER_CLASS` IS NOT STORED (`class_connection_rule.md`), so class-throttled
 * search across members CANNOT be built here. Scoping to the roster is the
 * shape that opens later without changing this UI.
 */

/** ⚠ Reasons are ranked; the first that computes is the one rendered. */
export type RosterReasonKind = "skills" | "learn" | "employer" | "worked" | "date";

export type RosterRow = {
  connectionId: string;
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  /** ⚠⚠ NEVER NULL. A row with no computable reason falls back to the date. */
  reason: string;
  reasonKind: RosterReasonKind;
  /**
   * ⚠⚠ THE CLASS RULE'S ONLY VISIBLE TRACE TODAY. Under that rule a buy-side
   * connection is not a peer connection at all. ⚠ NOT HIDDEN AND NOT DELETED —
   * buy-side colleague rows already exist (Test User 5, Ronnie Requester) and
   * they are real.
   * ⚠ A person who is BOTH is not marked: they are still a peer on the provider
   * axis, and marking them would say something the data does not support.
   */
  buySide: boolean;
  /**
   * ⚠⚠ THE SKILL NAMES THIS COLLEAGUE OFFERS (`P2-A3-E596` WS-E item 3).
   * ⚠ SEARCH-ONLY — nothing renders them. A roster row is a name, a title and
   * ONE reason; a list of chips per row would make it the directory it is
   * deliberately not.
   * ⚠⚠⚠ IT IS THE **SHOWN** SET, NOT THE HELD SET. `E517`'s rule is that an
   * offer surface shows only in-role skills — *"filter what is OFFERED, never
   * what is HELD"* — and a colleague list is an offer surface. Searching a
   * skill the person's own profile will not display would find somebody a
   * buyer then cannot verify.
   */
  skillNames: string[];
  connectedAt: Date;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/**
 * Every accepted colleague of the viewer, with the reason each is on the list.
 *
 * ⚠ ONE READ PER SOURCE, not one per colleague — the reason sources are
 * intersected in memory against sets built from the viewer's own rows.
 */
export async function getColleagueRoster(viewer: Viewer): Promise<RosterRow[]> {
  const me = viewer.userId;

  const connections = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: me }, { to_user_id: me }],
    },
    orderBy: { created_at: "desc" },
    select: { id: true, from_user_id: true, to_user_id: true, created_at: true },
  });
  if (connections.length === 0) return [];

  const otherIds = [
    ...new Set(connections.map((c) => (c.from_user_id === me ? c.to_user_id : c.from_user_id))),
  ];

  /* ⚠ SCOPED BY CONSTRUCTION: `id: { in: otherIds }` — the set is the viewer's
     own connections and cannot contain a stranger. */
  const people = await prisma.person.findMany({
    where: { user: { is: { id: { in: otherIds } } } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      title: true,
      photo_url: true,
      is_service_buyer: true,
      is_service_provider: true,
      company: { select: { name: true } },
      user: { select: { id: true } },
      providerProfile: {
        select: {
          /* ⚠ `skill_id` FEEDS THE SHARED-SKILL COUNT; the NAME and the role
             feed WS-E's search. ⚠⚠ `role_type_id` IS REQUIRED HERE — `E517`'s
             `shownSkills` needs it to decide what this person actually offers. */
          skills: { select: { skill_id: true, skill: { select: { name: true, role_type_id: true } } } },
          employers: { select: { name: true } },
          role_type_id: true,
          roles: { select: { role_type_id: true } },
        },
      },
    },
  });

  const mine = await prisma.person.findUnique({
    where: { user_id: me },
    select: {
      providerProfile: {
        select: {
          skills: { select: { skill_id: true } },
          employers: { select: { name: true } },
        },
      },
    },
  });
  const mySkills = new Set(mine?.providerProfile?.skills.map((s) => s.skill_id) ?? []);
  const myEmployers = new Set(
    (mine?.providerProfile?.employers ?? []).map((e) => (e.name ?? "").trim().toLowerCase())
  );

  /* ⚠ `From Learn` IS SHARED ENROLMENT. A path's forum is `ForumBoard`'s
     `learning_path_id` (`P1-J3-E383`), so "a forum in common" and "a path in
     common" are the SAME FACT for 23 of 27 boards — computed once, not twice. */
  const enrolments = await prisma.learnEnrollment.findMany({
    where: { user_id: { in: [me, ...otherIds] } },
    select: { user_id: true, learning_path_id: true },
  });
  const myPaths = new Set(
    enrolments.filter((e) => e.user_id === me).map((e) => e.learning_path_id)
  );
  const theirPaths = new Map<string, Set<string>>();
  for (const e of enrolments) {
    if (e.user_id === me) continue;
    const set = theirPaths.get(e.user_id) ?? new Set<string>();
    set.add(e.learning_path_id);
    theirPaths.set(e.user_id, set);
  }

  const byUser = new Map(people.filter((p) => p.user).map((p) => [p.user!.id, p]));

  const rows: RosterRow[] = [];
  for (const c of connections) {
    const otherId = c.from_user_id === me ? c.to_user_id : c.from_user_id;
    const p = byUser.get(otherId);
    if (!p) continue;

    const theirSkills = new Set(p.providerProfile?.skills.map((s) => s.skill_id) ?? []);
    const sharedSkills = [...mySkills].filter((s) => theirSkills.has(s)).length;
    const theirEmployers = new Set(
      (p.providerProfile?.employers ?? []).map((e) => (e.name ?? "").trim().toLowerCase())
    );
    const sharedEmployer = [...myEmployers].find((e) => e && theirEmployers.has(e)) ?? null;
    const sharedPaths = [...(theirPaths.get(otherId) ?? [])].filter((x) => myPaths.has(x)).length;

    /*
      ⚠⚠ RANKED, AND THE RANK IS NOT ARBITRARY. A shared skill is what makes
      somebody useful to ask; a shared employer is the strongest proof you
      actually know each other; Learn is the weakest of the three because two
      people can sit in a path and never meet.
      ⚠ THE DATE ALWAYS COMPUTES, so the line is NEVER blank.
    */
    let reason: string;
    let reasonKind: RosterReasonKind;
    if (sharedEmployer) {
      reason = `You both worked at ${sharedEmployer.replace(/\b\w/g, (m) => m.toUpperCase())}`;
      reasonKind = "employer";
    } else if (sharedSkills > 0) {
      reason = `${sharedSkills} shared ${sharedSkills === 1 ? "skill" : "skills"}`;
      reasonKind = "skills";
    } else if (sharedPaths > 0) {
      reason = `${sharedPaths} learning ${sharedPaths === 1 ? "path" : "paths"} in common`;
      reasonKind = "learn";
    } else {
      reason = `Connected ${fmtDate(c.created_at)}`;
      reasonKind = "date";
    }

    rows.push({
      connectionId: c.id,
      userId: otherId,
      personId: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      title: p.title,
      company: p.company?.name ?? null,
      photoUrl: p.photo_url,
      /* ⚠⚠ THE SHOWN SET, VIA `E517`'s ONE RULE — asked, never re-derived, which
         is the mistake `E585` records. ⚠ No selection shows everything, so a
         colleague with no role recorded is searchable on all of their skills. */
      skillNames: p.providerProfile
        ? shownSkills(
            selectedRoleIds(p.providerProfile),
            p.providerProfile.skills,
            (s) => s.skill.role_type_id
          ).map((s) => s.skill.name)
        : [],
      reason,
      reasonKind,
      buySide: p.is_service_buyer && !p.is_service_provider,
      connectedAt: c.created_at,
    });
  }
  return rows;
}

/**
 * ⚠ THE SEARCH IS AN IN-MEMORY FILTER OVER A LIST THE VIEWER ALREADY HAS.
 * ⚠⚠ NOT A QUERY. There is no database read here at all, so no future edit can
 * accidentally widen it to every member — the defect this page exists to close.
 */
export function filterRoster(rows: RosterRow[], q: string): RosterRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) =>
    [r.name, r.title, r.company].some((f) => f?.toLowerCase().includes(needle))
  );
}

/** ⚠ `worked` IS ALWAYS 0 TODAY and ships reading 0 — it is the counter that
    fills in when transactions exist. Shipping it at 0 is the honest version. */
export function rosterCounts(rows: RosterRow[]) {
  return {
    all: rows.length,
    skills: rows.filter((r) => r.reasonKind === "skills").length,
    learn: rows.filter((r) => r.reasonKind === "learn").length,
    worked: rows.filter((r) => r.reasonKind === "worked").length,
  };
}
