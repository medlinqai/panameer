import { prisma } from "@/lib/prisma";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";

// The profile's section-header counts (Skills, Specializations, Certifications), optionally "added since".
// Same rules as the profile view: Skills = role-shown skills; Certifications = the owner's certifications.
export async function profileSectionCounts(profileId: string, since: Date | null = null) {
  const after = since ? { created_at: { gte: since } } : {};
  const p = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: {
      role_type_id: true,
      roles: { select: { role_type_id: true } },
      skills: { where: after, select: { skill: { select: { role_type_id: true } } } },
      _count: { select: { specializations: { where: after } } },
      person: { select: { user_id: true } },
    },
  });
  if (!p) return { skills: 0, specializations: 0, certifications: 0 };
  const certifications = p.person.user_id ? await prisma.certification.count({ where: { user_id: p.person.user_id, ...after } }) : 0;
  return {
    skills: shownSkills(selectedRoleIds(p), p.skills, (s) => s.skill.role_type_id).length,
    specializations: p._count.specializations,
    certifications,
  };
}
