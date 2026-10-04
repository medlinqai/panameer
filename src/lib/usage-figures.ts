import { prisma } from "@/lib/prisma";
import { searchScoreFor } from "@/lib/masked-profile";

export type Figures = Record<string, number>;

export async function usageFigures(opts: {
  personId: string;
  userId: string;
  profileId: string | null;
}): Promise<Figures> {
  const { personId, userId, profileId } = opts;

  const [
    skills, specializations, certifications, profile,
    enrolled, pathsCreated,
    invitesSent, colleagues, groups,
    jobPostings, interviews, hires,
    productsPosted, offers, accepts,
    settlements, awaiting,
    proposalsSent, contractsWon,
  ] = await Promise.all([
    profileId ? prisma.providerSkill.count({ where: { provider_profile_id: profileId } }) : 0,
    profileId ? prisma.providerProfileSpecialization.count({ where: { provider_profile_id: profileId } }) : 0,
    profileId ? prisma.certification.count({ where: { provider_profile_id: profileId } }) : 0,
    profileId ? searchScoreFor(profileId) : 0,

    prisma.learnEnrollment.count({ where: { user_id: userId } }),
    prisma.learningPath.count({ where: { expert_person_id: personId } }),

    prisma.colleagueInvite.count({ where: { inviter_person_id: personId } }),
    prisma.connection.count({
      where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: userId }, { to_user_id: userId }] },
    }),
    prisma.groupMembership.count({ where: { person_id: personId } }),

    prisma.workRequest.count({ where: { buyer_person_id: personId } }),
    prisma.interviewRequest.count({ where: { provider_person_id: personId } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId } }),

    profileId ? prisma.serviceProduct.count({ where: { provider_profile_id: profileId, status: "PUBLISHED" } }) : 0,
    prisma.serviceProductOffer.count({ where: { provider_person_id: personId } }),
    prisma.serviceProductOffer.count({ where: { provider_person_id: personId, status: "ACCEPTED" } }),

    prisma.settlementRequest.count({ where: { provider_person_id: personId } }),
    prisma.settlementRequest.count({
      where: { provider_person_id: personId, status: { notIn: ["APPROVED", "PAID"] } },
    }),

    prisma.proposal.count({ where: { provider_person_id: personId } }),
    prisma.workOrder.count({ where: { provider_person_id: personId } }),
  ]);

  const enrollments = await prisma.learnEnrollment.findMany({
    where: { user_id: userId },
    select: { learning_path_id: true },
  });
  let completed = 0;
  for (const e of enrollments) {
    /* A lesson belongs to a SECTION, and the section to the path. */
    const lessons = await prisma.lesson.findMany({
      /* lesson → section → course → path. */
      where: { section: { course: { learning_path_id: e.learning_path_id } } },
      select: { id: true },
    });
    if (lessons.length === 0) continue;
    const done = await prisma.lessonProgress.count({
      where: { user_id: userId, lesson_id: { in: lessons.map((l) => l.id) } },
    });
    if (done === lessons.length) completed += 1;
  }

  const mine = await prisma.connection.findMany({
    where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: userId }, { to_user_id: userId }] },
    select: { from_user_id: true, to_user_id: true },
  });
  const firstHop = new Set<string>();
  for (const c of mine) {
    if (c.from_user_id !== userId) firstHop.add(c.from_user_id);
    if (c.to_user_id !== userId) firstHop.add(c.to_user_id);
  }
  const second = firstHop.size
    ? await prisma.connection.findMany({
        where: {
          kind: "COLLEAGUE",
          status: "ACCEPTED",
          OR: [{ from_user_id: { in: [...firstHop] } }, { to_user_id: { in: [...firstHop] } }],
        },
        select: { from_user_id: true, to_user_id: true },
      })
    : [];
  const reach = new Set(firstHop);
  for (const c of second) {
    reach.add(c.from_user_id);
    reach.add(c.to_user_id);
  }
  reach.delete(userId);

  return {
    "Skills Added": skills,
    Specializations: specializations,
    Certifications: certifications,
    "Search Score": profile,

    "Paths Enrolled": enrolled,
    "Paths Completed": completed,
    "Paths Created": pathsCreated,

    "Invites Sent": invitesSent,
    Colleagues: colleagues,
    "Groups Joined": groups,
    "Total Community": reach.size,

    "Job Postings": jobPostings,
    Interviews: interviews,
    Hires: hires,

    "Service Products Posted": productsPosted,
    Offers: offers,
    Accepts: accepts,

    "Settlement Requests": settlements,
    "Awaiting Approval": awaiting,

    "Proposals Sent": proposalsSent,
    "Contracts Won": contractsWon,
  };
}
