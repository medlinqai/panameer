import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";
import { workApp } from "@/lib/work-app";
import { appCounts } from "@/lib/attention";
import { APP_FILTER, countActions, todoGroups } from "@/lib/todo";
import { HubHome } from "@/components/home/HubHome";

export const metadata = { title: "Work · Panameer" };

// WK-E002: Work › Home at /work/home (/work is the public marketing page) — tiles, Things You Need to Do, What You Can Do.
export default async function WorkHomePage() {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true, first_name: true } });
  if (!me) redirect("/dashboard");
  const w = await workApp(me.id, viewer);
  // WK-E008: Things You Need to Do = the Worklist's Work items (appCounts keeps it current).
  await appCounts(viewer, "provider");
  const todo = await todoGroups(me.id, "provider", APP_FILTER.work.apps);
  const needYou = todo.reduce((n, g) => n + (g.n ?? 0), 0);
  const actionCount = countActions(todo, "/worklist?app=work");
  const first = displayFirstName(me.first_name);
  const n = (k: number, word: string) => `${k.toLocaleString("en-US")} ${word}${k === 1 ? "" : "s"}`;
  return (
    <div className="px-4 py-6 sm:px-6">
      <HubHome
        eyebrow="WORK" title={`Your Work${first ? `, ${first}` : ""}`}
        summary={`${n(needYou, "thing")} need you · ${n(w.openJobs, "open job")} · ${n(w.estimatesWaiting, "estimate")} waiting`}
        primary={{ label: "Browse the Job Board", href: "/find-work?tab=best" }} secondary={{ label: "Send an Estimate", href: "/estimate" }}
        donuts={w.donuts} actionCount={actionCount}
        actions={[
          { label: "Browse Jobs", href: "/find-work?tab=best", icon: "search" },
          { label: "Send Estimate", href: "/estimate", icon: "send" },
          { label: "Set Rates", href: "/catalog#services", icon: "tag" },
          { label: "Add Product", href: "/catalog#products", icon: "package" },
          { label: "Take a Test", href: "/learn/certificates", icon: "award" },
        ]}
      />
    </div>
  );
}
