import { prisma } from "@/lib/prisma";
import { inCur, listHref, metric, series, type Ctx } from "@/lib/admin-usage/core";
import { peopleList, type Lists } from "@/lib/admin-usage/lists";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Funnel, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E003: Register — sign-ups per day, verified %, where people stop, provider / buyer / requester, test vs real.
async function data(c: Ctx) {
  const users = await prisma.user.findMany({ select: { id: true, created_at: true, email_verified: true, is_test: true, person: { select: { id: true, is_service_provider: true, is_service_buyer: true, requesterProfile: { select: { completed_at: true } }, providerProfile: { select: { completeness: true } }, companyMemberships: { where: { status: "APPROVED" }, select: { id: true }, take: 1 } } } } });
  const joined = users.filter((u) => inCur(c, u.created_at) && c.userOk(u.id));
  return { users, joined };
}

export async function registerLists(c: Ctx): Promise<Lists> {
  const pick = async (f: (u: Awaited<ReturnType<typeof data>>["joined"][number]) => boolean, title: string) => peopleList(title, (await data(c)).joined.filter(f).map((u) => u.id));
  return {
    signups: () => pick(() => true, `Sign-ups (${c.label})`),
    verified: () => pick((u) => !!u.email_verified, "Verified"),
    company: () => pick((u) => !!u.person?.companyMemberships.length, "Company linked"),
    profile: () => pick((u) => (u.person?.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD || !!u.person?.requesterProfile?.completed_at, "Profile done"),
    providers: () => pick((u) => !!u.person?.is_service_provider, "Providers"),
    buyers: () => pick((u) => !!u.person?.is_service_buyer && !u.person?.requesterProfile, "Buyers"),
    requesters: () => pick((u) => !!u.person?.requesterProfile, "Requesters"),
    test: async () => peopleList(`Test accounts created (${c.label})`, (await data(c)).users.filter((u) => u.is_test && inCur(c, u.created_at)).map((u) => u.id)),
  };
}

export async function Register({ c }: { c: Ctx }) {
  const { users, joined } = await data(c);
  const verified = joined.filter((u) => u.email_verified).length;
  const company = joined.filter((u) => u.person?.companyMemberships.length).length;
  const profile = joined.filter((u) => (u.person?.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD || u.person?.requesterProfile?.completed_at).length;
  const test = users.filter((u) => u.is_test && inCur(c, u.created_at)).length;
  const real = users.filter((u) => !u.is_test && inCur(c, u.created_at)).length;
  return (
    <div className="space-y-3">
      <UsageChart title="Sign-Ups per Day" subtitle={c.label} points={series(c, users.filter((u) => c.userOk(u.id)).map((u) => u.created_at))} />
      <Tiles>
        <Tile label="Sign-Ups" {...metric(c, users.filter((u) => c.userOk(u.id)).map((u) => u.created_at))} href={listHref(c, "signups")} />
        <Tile label="Verified" value={joined.length ? `${Math.round((verified / joined.length) * 100)}%` : "—"} delta={`${verified} of ${joined.length}`} href={listHref(c, "verified")} />
        <Tile label="Real Accounts" value={real} href={listHref(c, "signups")} />
        <Tile label="Test Accounts" value={test} href={listHref(c, "test")} />
      </Tiles>
      <Grid2>
        <Funnel title="Where People Stop" subtitle={`members who signed up ${c.label}, by registration step`} steps={[
          { label: "Signed up", n: joined.length, href: listHref(c, "signups") },
          { label: "Verified", n: verified, href: listHref(c, "verified") },
          { label: "Company linked", n: company, href: listHref(c, "company") },
          { label: "Profile done", n: profile, href: listHref(c, "profile") },
        ]} />
        <Bars title="Provider · Buyer · Requester" subtitle={`sign-ups ${c.label}`} rows={[
          { label: "Providers", n: joined.filter((u) => u.person?.is_service_provider).length, href: listHref(c, "providers") },
          { label: "Buyers", n: joined.filter((u) => u.person?.is_service_buyer && !u.person?.requesterProfile).length, href: listHref(c, "buyers") },
          { label: "Requesters", n: joined.filter((u) => u.person?.requesterProfile).length, href: listHref(c, "requesters") },
        ]} />
      </Grid2>
    </div>
  );
}
