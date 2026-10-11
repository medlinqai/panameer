import { prisma } from "@/lib/prisma";
import { inCur, listHref, metric, series, span, type Ctx } from "@/lib/admin-usage/core";
import { peopleList, personUsers, type Lists } from "@/lib/admin-usage/lists";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E004: Profile — completeness distribution, published vs hidden, résumé imports, views per day, recommendations.
const BUCKETS = [[0, 25], [25, 50], [50, 75], [75, 101]] as const;
async function data(c: Ctx) {
  const [profiles, imports, views, recs] = await Promise.all([
    prisma.providerProfile.findMany({ select: { id: true, person_id: true, completeness: true } }),
    prisma.profileImport.findMany({ where: { created_at: span(c) }, select: { created_at: true, providerProfile: { select: { person_id: true } } } }),
    prisma.profileView.findMany({ where: { viewed_at: span(c) }, select: { viewed_at: true } }),
    prisma.recommendationRequest.findMany({ select: { created_at: true, sent_at: true, responded_at: true, status: true, providerProfile: { select: { person_id: true } } } }),
  ]);
  return { profiles: profiles.filter((p) => c.personOk(p.person_id)), imports: imports.filter((i) => c.personOk(i.providerProfile.person_id)), views, recs: recs.filter((r) => c.personOk(r.providerProfile.person_id)) };
}
const label = ([a, b]: readonly [number, number]) => `${a}–${b === 101 ? 100 : b}%`;

export async function profileLists(c: Ctx): Promise<Lists> {
  const by = async (f: (n: number) => boolean, title: string) => peopleList(title, personUsers(c, (await data(c)).profiles.filter((p) => f(p.completeness)).map((p) => p.person_id)), undefined);
  return {
    ...Object.fromEntries(BUCKETS.map((b) => [`bucket-${b[0]}`, () => by((n) => n >= b[0] && n < b[1], `Profiles ${label(b)} complete`)])),
    published: () => by((n) => n >= VISIBILITY_THRESHOLD, `Published profiles (≥ ${VISIBILITY_THRESHOLD}%)`),
    hidden: () => by((n) => n < VISIBILITY_THRESHOLD, `Hidden profiles (< ${VISIBILITY_THRESHOLD}%)`),
    imports: async () => peopleList(`Résumé imports (${c.label})`, personUsers(c, (await data(c)).imports.filter((i) => inCur(c, i.created_at)).map((i) => i.providerProfile.person_id))),
  };
}

export async function Profile({ c }: { c: Ctx }) {
  const d = await data(c);
  const published = d.profiles.filter((p) => p.completeness >= VISIBILITY_THRESHOLD).length;
  return (
    <div className="space-y-3">
      <UsageChart title="Profile Views per Day" subtitle={c.label} points={series(c, d.views.map((v) => v.viewed_at))} />
      <Tiles>
        <Tile label="Published" value={published} delta={`completeness ≥ ${VISIBILITY_THRESHOLD}%`} href={listHref(c, "published")} />
        <Tile label="Hidden" value={d.profiles.length - published} href={listHref(c, "hidden")} />
        <Tile label="Résumé Imports" {...metric(c, d.imports.map((i) => i.created_at))} href={listHref(c, "imports")} />
        <Tile label="Recommendations Written" {...metric(c, d.recs.filter((r) => r.status === "SUBMITTED").map((r) => r.responded_at))} />
      </Tiles>
      <Grid2>
        <Bars title="Completeness" subtitle="provider profiles now" rows={BUCKETS.map((b) => ({ label: label(b), n: d.profiles.filter((p) => p.completeness >= b[0] && p.completeness < b[1]).length, href: listHref(c, `bucket-${b[0]}`) }))} />
        <Bars title="Recommendations" subtitle={c.label} rows={[
          { label: "Requested", n: d.recs.filter((r) => inCur(c, r.sent_at ?? r.created_at)).length },
          { label: "Written", n: d.recs.filter((r) => r.status === "SUBMITTED" && inCur(c, r.responded_at)).length },
        ]} />
      </Grid2>
    </div>
  );
}
