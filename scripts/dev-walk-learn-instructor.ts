// L-E035..L-E038 dev run: the helpers against a throwaway DRAFT path — one notice per learner per event, and messaging opens.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-learn-instructor.ts
import { prisma } from "@/lib/prisma";
import { notifyInstructorEnrolled, notifyPathCompletedIfDone, pathInstructor } from "@/lib/learn-instructor";
import { canMessage } from "@/lib/messages";
import { check, cleanup, done, party } from "./lib/dev-fixture";

async function main() {
  const tag = Date.now().toString(36);
  const teacher = await party("PROVIDER", "Tia");
  const learner = await party("BUYER", "Lee");
  const path = await prisma.learningPath.create({
    data: {
      title: `Devwalk path ${tag}`, slug: `devwalk-${tag}`, audience: "END_USER", status: "DRAFT",
      courses: { create: [{ title: "Course A", slug: `a-${tag}`, sections: { create: [{ title: "S1", lessons: { create: [
        { title: "L1", vimeo_ref: "123", production_status: "URL_ADDED_TO_LESSON", expert_person_id: teacher.personId },
        { title: "L2", vimeo_ref: "124", production_status: "URL_ADDED_TO_LESSON", expert_person_id: teacher.personId },
        { title: "L3 (coming soon)", production_status: "IN_CONCEPT", expert_person_id: teacher.personId },
      ] } }] } }] },
    },
    include: { courses: { include: { sections: { include: { lessons: true } } } } },
  });
  const lessons = path.courses[0].sections[0].lessons;
  try {
    check("instructor = whoever fronts the most lessons (no expert on the path)", (await pathInstructor(path.id)) === teacher.personId);
    check("before enrolling: no message permission", !(await canMessage(learner.viewer, teacher.viewer.userId)).ok);
    await prisma.learnEnrollment.create({ data: { user_id: learner.viewer.userId, learning_path_id: path.id } });
    await notifyInstructorEnrolled(learner.viewer.userId, path.id);
    await notifyInstructorEnrolled(learner.viewer.userId, path.id);
    const count = (k: string) => prisma.notification.count({ where: { event_key: k, entity_id: path.id } });
    check("enroll → exactly one instructor notice, even when called twice", (await count("learn.path_enrolled.instructor")) === 1);
    const n = await prisma.notification.findFirst({ where: { event_key: "learn.path_enrolled.instructor", entity_id: path.id } });
    check("notice is worklist, links to a message with the learner", !!n?.requires_action && n.href === `/messages?with=${learner.viewer.userId}`);
    check("instructor ↔ trainee can message both ways", (await canMessage(learner.viewer, teacher.viewer.userId)).ok && (await canMessage(teacher.viewer, learner.viewer.userId)).ok);
    await notifyInstructorEnrolled(teacher.viewer.userId, path.id);
    check("instructor enrolling in their own path is not notified", (await count("learn.path_enrolled.instructor")) === 1);

    await prisma.lessonProgress.create({ data: { user_id: learner.viewer.userId, lesson_id: lessons.find((l) => l.title === "L1")!.id } });
    await notifyPathCompletedIfDone(learner.viewer.userId, path.id);
    check("half done → no path-completed notice", (await count("learn.path_completed.instructor")) === 0);
    await prisma.lessonProgress.create({ data: { user_id: learner.viewer.userId, lesson_id: lessons.find((l) => l.title === "L2")!.id } });
    await notifyPathCompletedIfDone(learner.viewer.userId, path.id);
    await notifyPathCompletedIfDone(learner.viewer.userId, path.id);
    check("every playable lesson done (Coming Soon ignored) → one learner + one instructor notice", (await count("learn.path_completed.instructor")) === 1 && (await count("learn.path_completed.learner")) === 1);
  } finally {
    await prisma.lessonProgress.deleteMany({ where: { lesson_id: { in: lessons.map((l) => l.id) } } });
    await prisma.learnEnrollment.deleteMany({ where: { learning_path_id: path.id } });
    await prisma.notification.deleteMany({ where: { entity_id: path.id } });
    await prisma.learningPath.delete({ where: { id: path.id } });
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await cleanup(); process.exitCode = done("dev-walk-learn-instructor") || process.exitCode; await prisma.$disconnect(); });
