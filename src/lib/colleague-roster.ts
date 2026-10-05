import { prisma } from "@/lib/prisma";
import { countryName } from "@/lib/country";
import { formatPlace } from "@/lib/location";
import type { Viewer } from "@/lib/access";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";

export type RosterReasonKind = "skills" | "learn" | "employer" | "worked" | "date";

export type RosterRow = {
  connectionId: string;
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  company: string | null;
  companyId: string | null;
  photoUrl: string | null;
  reason: string;
  reasonKind: RosterReasonKind;
  buySide: boolean;
  skillNames: string[];
  location: string | null;
  mutualCount: number;
  sharedSkillCount: number;
  profileHref: string | null;
  connectedAt: Date;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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

  const people = await prisma.person.findMany({
    where: { user: { is: { id: { in: otherIds }, is_active: true, is_test: false } } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      title: true,
      photo_url: true,
      is_service_buyer: true,
      is_service_provider: true,
      company: { select: { id: true, name: true, show_on_profiles: true } },
      site: {
        select: {
          addresses: {
            select: { city: true, country: true, country_code: true },
            take: 1,
          },
        },
      },
      user: { select: { id: true } },
      providerProfile: {
        select: {
          id: true,
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

  const theirEdges = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: { in: otherIds } }, { to_user_id: { in: otherIds } }],
    },
    select: { from_user_id: true, to_user_id: true },
  });
  const colleaguesOf = new Map<string, Set<string>>();
  for (const e of theirEdges) {
    for (const [a, b] of [
      [e.from_user_id, e.to_user_id],
      [e.to_user_id, e.from_user_id],
    ]) {
      if (!otherIds.includes(a)) continue;
      if (!colleaguesOf.has(a)) colleaguesOf.set(a, new Set());
      colleaguesOf.get(a)!.add(b);
    }
  }
  const myColleagues = new Set(otherIds);

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
      company: p.company?.show_on_profiles ? p.company.name : null,
      companyId: p.company?.show_on_profiles ? p.company.id : null,
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
      /* ⚠ `P2-A1.1-E742` (B2). `formatPlace` drops an empty part rather than
         rendering ", United States", and `countryName` is the one resolver. */
      location: (() => {
        const a = p.site?.addresses[0];
        return formatPlace(a?.city, countryName(a?.country_code, a?.country));
      })(),
      mutualCount: (() => {
        const theirs = colleaguesOf.get(otherId);
        if (!theirs) return 0;
        let n = 0;
        for (const x of theirs) {
          /* ⚠ Neither the viewer nor this colleague counts as "in common". */
          if (x === me || x === otherId) continue;
          if (myColleagues.has(x)) n += 1;
        }
        return n;
      })(),
      sharedSkillCount: sharedSkills,
      profileHref: p.providerProfile ? `/providers/${p.providerProfile.id}` : null,
      connectedAt: c.created_at,
    });
  }

  /*
    ── ⚠⚠⚠ THE ORDER SCOTT SPECIFIED (`P2-A1.1-E742`, B2) ────────────────────

    ⚠ *"colleagues in common first, then shared skills, then name, reusing
    existing signals (no second ranker)."*
    ⚠⚠ **BOTH SIGNALS ARE ALREADY ON THE ROW** — `mutualCount` from the single
    query above, `sharedSkillCount` from the reason line that was already being
    computed. ⚠⚠⚠ **NOTHING NEW IS SCORED, WEIGHTED OR TUNED**, which is what
    *"no second ranker"* forbids: a weighted blend of the two would be a new
    ranking model nobody asked for and nobody could explain to a member.
    ⚠ The name is the final tie-break, so the order is TOTAL and stable — a list
    that reshuffles between loads looks broken even when it is not.
  */
  rows.sort(
    (a, b) =>
      b.mutualCount - a.mutualCount ||
      b.sharedSkillCount - a.sharedSkillCount ||
      a.name.localeCompare(b.name)
  );
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
