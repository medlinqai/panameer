import { prisma } from "@/lib/prisma";
import {
  countThreadsWaitingOn,
  listThreadsWaitingOn,
  pathForumAccess,
} from "@/lib/forums";
import { groupOffer, type GroupOffer } from "@/lib/group-membership";
import type { Viewer } from "@/lib/access";

export type GroupCircle = {
  slug: string;
  title: string;
  members: number;
  posts: number;
  quiet: boolean;
};

export type GroupCard = {
  slug: string;
  title: string;
  role: "You Run It" | "Member";
  pathBacked: boolean;
  members: number;
  posts: number;
  lastActivity: Date | null;
};

export type GroupsHome = {
  circles: GroupCircle[];
  /** The three counted figures in the header's right half. */
  runCount: number;
  questionsWaiting: number;
  joinedCount: number;
  needsYou: {
    id: string;
    title: string;
    boardSlug: string;
    boardTitle: string;
    askedAt: Date;
  }[];
  run: GroupCard[];
  joined: GroupCard[];
  thisMonth: { asked: number; answered: number; newMembers: number };
  starterSlug: string | null;
};

function quietestFirst(a: GroupCard, b: GroupCard): number {
  if (a.posts !== b.posts) return a.posts - b.posts;
  if (a.members !== b.members) return a.members - b.members;
  return a.title.localeCompare(b.title);
}

export async function getGroupsHome(viewer: Viewer): Promise<GroupsHome> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const access = await pathForumAccess(viewer);
  const myPathIds = [...new Set([...access.enrolled, ...access.taught])];

  const boards = await prisma.forumBoard.findMany({
    where: {
      OR: [{ learning_path_id: null }, { learning_path_id: { in: myPathIds } }],
    },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      learning_path_id: true,
      host_person_id: true,
      _count: {
        select: {
          threads: true,
          members: { where: { state: "ACTIVE" } },
        },
      },
      threads: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: { created_at: true },
      },
    },
  });

  const card = (b: (typeof boards)[number], role: GroupCard["role"]): GroupCard => ({
    slug: b.slug,
    title: b.title,
    role,
    pathBacked: b.learning_path_id !== null,
    members: b._count.members,
    posts: b._count.threads,
    lastActivity: b.threads[0]?.created_at ?? null,
  });

  const runBoards = person
    ? boards.filter((b) => b.host_person_id === person.id)
    : [];
  const runSlugs = new Set(runBoards.map((b) => b.slug));

  const myMemberships = person
    ? await prisma.groupMembership.findMany({
        where: { person_id: person.id, state: "ACTIVE" },
        select: { board_id: true },
      })
    : [];
  const joinedBoardIds = new Set(myMemberships.map((m) => m.board_id));
  const joinedBoards = boards.filter(
    (b) => joinedBoardIds.has(b.id) && !runSlugs.has(b.slug)
  );

  const circles: GroupCircle[] = boards.map((b) => ({
    slug: b.slug,
    title: b.title,
    members: b._count.members,
    posts: b._count.threads,
    quiet: b._count.threads === 0,
  }));

  const runPathIds = runBoards
    .map((b) => b.learning_path_id)
    .filter((id): id is string => id !== null);
  const questionsWaiting = person
    ? await countThreadsWaitingOn(person.id, runPathIds)
    : 0;

  const needsYou = person
    ? await listThreadsWaitingOn(person.id, runBoards.map((b) => b.id))
    : [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [asked, answered, newMembers] = person
    ? await Promise.all([
        prisma.forumThread.count({
          where: { author_id: person.id, created_at: { gte: monthStart } },
        }),
        prisma.forumPost.count({
          where: { author_id: person.id, created_at: { gte: monthStart } },
        }),
        runBoards.length
          ? prisma.groupMembership.count({
              where: {
                board_id: { in: runBoards.map((b) => b.id) },
                state: "ACTIVE",
                created_at: { gte: monthStart },
              },
            })
          : Promise.resolve(0),
      ])
    : [0, 0, 0];

  const starterSlug = runBoards.length
    ? [...runBoards].sort((a, b) => a._count.threads - b._count.threads)[0].slug
    : null;

  return {
    circles,
    runCount: runBoards.length,
    questionsWaiting,
    joinedCount: joinedBoards.length,
    needsYou,
    run: runBoards.map((b) => card(b, "You Run It")).sort(quietestFirst),
    joined: joinedBoards.map((b) => card(b, "Member")).sort(quietestFirst),
    thisMonth: { asked, answered, newMembers },
    starterSlug,
  };
}

/** A group you are not in, as Discover shows it. */
export type DiscoverGroup = {
  boardId: string;
  slug: string;
  title: string;
  members: number;
  posts: number;
  offer: GroupOffer;
  pathSlug: string | null;
};

export type DiscoverTrack = { track: string; groups: DiscoverGroup[] };

export async function getDiscoverGroups(viewer: Viewer): Promise<DiscoverTrack[]> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const boards = await prisma.forumBoard.findMany({
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      price_cents: true,
      price_period: true,
      learning_path_id: true,
      host_person_id: true,
      learningPath: { select: { slug: true, group: true } },
      _count: {
        select: { threads: true, members: { where: { state: "ACTIVE" } } },
      },
    },
  });

  const mine = person
    ? new Set(
        (
          await prisma.groupMembership.findMany({
            where: { person_id: person.id, state: "ACTIVE" },
            select: { board_id: true },
          })
        ).map((m) => m.board_id)
      )
    : new Set<string>();

  const out = new Map<string, DiscoverGroup[]>();
  for (const b of boards) {
    const isMine = mine.has(b.id) || (person != null && b.host_person_id === person.id);
    if (isMine) continue;

    const offer = groupOffer(b, false);

    const track = b.learning_path_id
      ? (b.learningPath?.group ?? "Learning Paths")
      : "Panameer Groups";

    if (!out.has(track)) out.set(track, []);
    out.get(track)!.push({
      boardId: b.id,
      slug: b.slug,
      title: b.title,
      members: b._count.members,
      posts: b._count.threads,
      offer,
      pathSlug: b.learningPath?.slug ?? null,
    });
  }

  return [...out.entries()]
    .map(([track, groups]) => ({ track, groups }))
    .sort((a, b) => b.groups.length - a.groups.length || a.track.localeCompare(b.track));
}

export type JoinRequestRow = {
  id: string;
  groupSlug: string;
  groupTitle: string;
  personName: string;
  askedAt: Date;
};

export type MyRequestRow = {
  groupSlug: string;
  groupTitle: string;
  state: "PENDING" | "DECLINED";
  askedAt: Date;
  decidedAt: Date | null;
};

export async function getGroupRequests(
  viewer: Viewer
): Promise<{ incoming: JoinRequestRow[]; mine: MyRequestRow[] }> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return { incoming: [], mine: [] };

  const [incoming, mine] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { state: "PENDING", board: { host_person_id: person.id } },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        created_at: true,
        board: { select: { slug: true, title: true } },
        person: { select: { first_name: true, last_name: true } },
      },
    }),
    prisma.groupMembership.findMany({
      where: { person_id: person.id, state: { in: ["PENDING", "DECLINED"] } },
      orderBy: { created_at: "desc" },
      select: {
        created_at: true,
        decided_at: true,
        state: true,
        board: { select: { slug: true, title: true } },
      },
    }),
  ]);

  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      groupSlug: r.board.slug,
      groupTitle: r.board.title,
      personName: [r.person.first_name, r.person.last_name].filter(Boolean).join(" ") || "A member",
      askedAt: r.created_at,
    })),
    mine: mine.map((r) => ({
      groupSlug: r.board.slug,
      groupTitle: r.board.title,
      state: r.state as "PENDING" | "DECLINED",
      askedAt: r.created_at,
      decidedAt: r.decided_at,
    })),
  };
}

export async function countPendingForOwner(viewer: Viewer): Promise<number> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return 0;
  return prisma.groupMembership.count({
    where: { state: "PENDING", board: { host_person_id: person.id } },
  });
}
