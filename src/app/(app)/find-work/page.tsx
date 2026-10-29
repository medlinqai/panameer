import { redirect } from "next/navigation";

// Scott 10-29: the old job board is gone — every /find-work URL lands on its Work page.
const TO: Record<string, string> = {
  best: "/work/jobs?kind=matched", recent: "/work/jobs?kind=posted", us: "/work/jobs?kind=posted", saved: "/work/jobs?kind=interested",
  invitations: "/work/jobs?stage=They%20Requested", proposals: "/work/jobs?stage=You%20Applied",
  interviews: "/work/interviews", tests: "/work/interviews?stage=tests", agent: "/work/job-agent", external: "/work/jobs?kind=external",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; view?: string }> }) {
  const sp = await searchParams;
  if (sp.view === "week") redirect("/work/interviews?view=week");
  redirect(TO[sp.tab ?? ""] ?? "/work/jobs");
}
