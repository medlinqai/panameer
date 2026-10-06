import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { buildCompletenessInput } from "@/lib/onboarding";
import { COMPLETENESS_WEIGHTS, missingRequired } from "@/lib/completeness";
import { unreadCount } from "@/lib/messages";
import { getPendingRequests } from "@/lib/company";

// Dashboard "5 things you can do today": cards picked per person from what's missing, most useful first.
export type Thing = {
  key: string;
  icon: "eye" | "chart" | "badge" | "book" | "folder" | "people" | "search" | "tag" | "send";
  title: string;
  line: string;
  chips: string[];
  time: string;
  cta: { label: string; href: string };
  toggleVisibility?: boolean;
};

// missingRequired phrase → the score line it fills.
const PHRASE_KEY: Record<string, keyof typeof COMPLETENESS_WEIGHTS> = {
  "a title": "headline", "a role": "field", "at least three skills": "skills", "your rate": "rate", "a photo": "photo",
  "your address": "identity", "your phone number": "identity", "a bio of at least 100 characters": "overview",
  "at least one specialization": "specializations", "at least one language": "languages", "your location": "location",
};
const short = (p: string) => p.replace(/^at least (one|three) /, (_, n) => (n === "one" ? "a " : "3 ")).replace(/^your /, "your ").replace(" of at least 100 characters", "");

export async function fiveThings(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      providerProfile: { select: { id: true, paused_at: true, completeness: true, pillar: { select: { name: true } }, _count: { select: { projects: true, serviceProducts: true } } } },
    },
  });
  const pp = person?.providerProfile ?? null;
  const things: Thing[] = [];

  if (pp?.paused_at)
    things.push({ key: "visible", icon: "eye", title: "Get seen by buyers", line: "Your profile is hidden. Turn it back on.", chips: [], time: "1 click", cta: { label: "Turn On", href: "/profile" }, toggleVisibility: true });

  if (pp) {
    const input = await buildCompletenessInput(pp.id);
    const missing = input ? missingRequired(input) : [];
    if (missing.length) {
      const keys = [...new Set(missing.slice(0, 2).map((m) => PHRASE_KEY[m]).filter(Boolean))];
      const gain = keys.reduce((n, k) => n + COMPLETENESS_WEIGHTS[k], 0);
      const two = missing.slice(0, 2).map(short);
      things.push({ key: "rank", icon: "chart", title: "Rank higher in search", line: `Add ${two.join(" and ")}.`, chips: gain ? [`+${gain} Score`] : [], time: "3 min", cta: { label: "Add Now", href: "/profile" } });
    }
  }

  // Learn lets anyone take a path's test without finishing the course.
  const earned = new Set((await prisma.certification.findMany({ where: { user_id: viewer.userId, learning_path_id: { not: null } }, select: { learning_path_id: true } })).map((c) => c.learning_path_id));
  const tests = await prisma.certificationTest.findMany({ where: { status: "PUBLISHED", learningPath: { status: "PUBLISHED" } }, select: { learningPath: { select: { id: true, slug: true, title: true, pillar: true } } }, take: 50 });
  const field = pp?.pillar?.name ?? null;
  const test = tests.map((t) => t.learningPath).filter((p) => !earned.has(p.id)).sort((a, b) => Number(b.pillar === field) - Number(a.pillar === field))[0];
  if (test)
    things.push({ key: "test", icon: "badge", title: "Get certified — skip the course", line: `Already know ${test.title}? Take the test only.`, chips: ["+ Credential"], time: "20 min", cta: { label: "Take a Test", href: `/learn/${test.slug}/test` } });

  things.push({ key: "learn", icon: "book", title: "Learn for free", line: field ? `Free courses in ${field}.` : "Free courses from people who do the work.", chips: ["Free"], time: "", cta: { label: "Browse Free", href: "/learn" } });

  if (pp && pp._count.projects === 0)
    things.push({ key: "project", icon: "folder", title: "Show your work", line: "Add one past project buyers can see.", chips: [`+${COMPLETENESS_WEIGHTS.soloProjects} Score`], time: "5 min", cta: { label: "Add Project", href: "/profile#projects" } });

  const fillers: Thing[] = [
    { key: "connect", icon: "people", title: "Connect with colleagues", line: "People you've worked with make you easier to trust.", chips: ["Free"], time: "2 min", cta: { label: "Find Colleagues", href: "/community" } },
    { key: "work", icon: "search", title: "Browse open work", line: "Requests posted by buyers right now.", chips: [], time: "", cta: { label: "Browse Work", href: "/find-work" } },
    pp
      ? { key: "service", icon: "tag", title: "List a service", line: "A fixed-price package buyers can order today.", chips: [], time: "10 min", cta: { label: "List a Service", href: "/my-services" } }
      : { key: "post", icon: "send", title: "Post work", line: "Describe the job; providers send proposals.", chips: ["Free"], time: "5 min", cta: { label: "Post Work", href: "/create-work" } },
  ];
  for (const f of fillers) if (things.length < 5) things.push(f);

  const [messages, requests, credentials] = await Promise.all([
    unreadCount(viewer),
    getPendingRequests(viewer).then((r) => r.length).catch(() => 0),
    prisma.certification.count({ where: { user_id: viewer.userId } }),
  ]);
  const hidden = !!pp && (!!pp.paused_at || pp.completeness < 80);
  const waiting = [
    { key: "messages", icon: "message", value: String(messages), label: messages === 1 ? "new message" : "new messages", href: "/messages", problem: false },
    { key: "requests", icon: "person", value: String(requests), label: "asking to join", href: "/company/people#asking", problem: false },
    { key: "visibility", icon: "alert", value: hidden ? "Hidden" : "Visible", label: hidden ? "your profile is off" : "buyers can find you", href: "/profile", problem: hidden },
    { key: "credentials", icon: "badge", value: String(credentials), label: credentials === 1 ? "credential earned" : "credentials earned", href: "/profile#certifications", problem: false },
  ];
  return { things: things.slice(0, 5), waiting };
}
