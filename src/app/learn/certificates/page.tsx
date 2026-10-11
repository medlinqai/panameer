import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalog } from "@/lib/learn-catalog";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { CertificateCard } from "@/components/certificates/CertificateCard";
import { CertificateActions } from "@/components/certificates/CertificateActions";
import { myCertificates } from "@/lib/certificates";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { CertRing } from "@/components/learn/CertRing";
import { UpNextCard } from "@/components/learn/UpNextCard";
import { countWord, youTotalAverage } from "@/components/learn/YouTotalAverage";
import { memberCertificateAverage } from "@/lib/learn-averages";
import { recommendNext, testOutPicks } from "@/lib/learn-next";

export const metadata = { title: "Certificates — Panameer", description: "Your Learn certificates and certification tests." };
export const dynamic = "force-dynamic";

// T-E001: Certificates is its own page (moved from My Learning): certificates | tests.
export default async function CertificatesPage() {
  const viewer = await memberOrPublicTwin("/learn");
  const [paths, teaches] = await Promise.all([learnCatalog(viewer.userId), viewerTeaches(viewer)]);
  const certified = paths.filter((p) => p.certificate);
  const [mine, average, rec, testOut] = await Promise.all([myCertificates(viewer.userId), memberCertificateAverage(), recommendNext(viewer.userId, { paths }), testOutPicks(viewer.userId, { paths })]);
  // LT-E003: You · Total · Average — certificates, paths with a published test, the member average.
  const withTest = paths.filter((p) => p.test.ready);
  const badges = certified
    .map((p) => ({ slug: p.slug, title: p.title, at: p.certificate!.earnedOn }))
    .sort((a, b) => a.at.localeCompare(b.at));
  const newest = badges[badges.length - 1] ?? null;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = badges.filter((b) => new Date(b.at) >= monthStart).length;
  const passed = paths.filter((p) => p.test.passed).length;
  const best = Math.max(0, ...paths.map((p) => p.test.best ?? 0));
  // Up Next = the closest certificate: Ready to Test, else the best Test Out pick, else the next recommended path.
  const ready = paths.find((p) => !p.certificate && p.test.ready && p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total && p.test.used < p.test.maxAttempts);
  const out = !ready ? testOut.find((x) => x.path.test.ready && !x.path.certificate && x.path.test.used < x.path.test.maxAttempts) ?? null : null;
  const up = ready ? { path: ready, label: "Up Next · Ready to Test", test: true } : out ? { path: out.path, label: `Up Next · Test Out · ${out.reason}`, test: true } : rec.picks[0] ? { path: rec.picks[0].path, label: `Up Next · ${rec.picks[0].reason}`, test: false } : null;
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const tests = paths.filter((p) => p.test.ready && (p.mine || p.test.used > 0 || p.certificate));
  const row = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5";
  const BTN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";
  return (
    <>
      <LearnTabs active="certificates" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learn-certificates>
        <AccountHero
          testId="certificates-hero"
          picture={
            <div>
              <CertRing certified={certified.length} total={withTest.length} badges={badges} />
              {newest && <p className="mt-2 text-center text-[12px] text-ink-2" data-newest-certificate>Newest: <b className="text-ink">{newest.title}</b> · {when(newest.at)}</p>}
            </div>
          }
          eyebrow="Certificates"
          title={certified.length ? `${countWord(certified.length)} ${certified.length === 1 ? "Certificate" : "Certificates"} and Counting` : "Earn Your First Certificate"}
          kpis={[
            ...youTotalAverage({ you: certified.length, youLabel: "CERTIFICATES", month: thisMonth, total: withTest.length, totalLabel: "OF PATHS WITH A TEST", average }),
            { value: passed, label: "TESTS PASSED" },
            { value: best ? `${best}%` : "—", label: "BEST SCORE" },
          ]}
          paragraph={
            <>
              <span className="mb-3 block">Certificates show on your profile under <b className="text-ink">Credentials</b>. Pass a path&apos;s test to earn one.</span>
              {up && <UpNextCard path={up.path} label={up.label} />}
            </>
          }
          actions={
            up ? (
              <>
                {up.test ? <Link href={`/learn/${up.path.slug}/test`} data-take-test className={HERO_BTN}>Take the Test</Link> : <Link href={up.path.mine?.next ? `/learn/${up.path.slug}/${up.path.mine.next.id}` : `/learn/${up.path.slug}`} className={HERO_BTN}>Start {up.path.title}</Link>}
                <Link href="/learn/paths" className={HERO_BTN_W}>Browse Learning Paths</Link>
              </>
            ) : (
              <Link href="/learn/paths" className={HERO_BTN}>Browse Learning Paths</Link>
            )
          }
        />
        <div className="mt-2 grid md:grid-cols-2">
          <section className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[20px] font-bold">Certificates <small className="ml-1 text-[12px] font-medium text-ink-3">{mine.length}</small></h2>
            {/* L-E060: each certificate as the gradient card, with its actions. */}
            {mine.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-ink-2">No certificates yet. Pass a path&apos;s test to earn one.</p>
            ) : (
              <ul className="mt-3 grid gap-5">
                {mine.map((c) => (
                  <li key={c.credentialId} data-my-certificate>
                    <Link href={`/verify/${c.credentialId}`} className="block hover:brightness-110">
                      <CertificateCard size="thumb" title={c.title} holder={c.holder} issuedOn={c.issuedOn} credentialId={c.credentialId} />
                    </Link>
                    <div className="mt-2">
                      <CertificateActions compact title={c.title} credentialId={c.credentialId} issuedOn={c.issuedOn.toISOString()} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <h2 className="text-[20px] font-bold">Tests <small className="ml-1 text-[12px] font-medium text-ink-3">attempts left</small></h2>
            {tests.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2">Tests for your paths show here once they open.</p>}
            <ul>
              {tests.map((p) => (
                <li key={p.id} className={row}>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px]">{p.title}</b>
                    <span className="block text-[12px] text-ink-3">{p.test.passed ? `Passed ${p.test.best}%` : p.test.used ? `Best ${p.test.best}% · ${Math.max(0, p.test.maxAttempts - p.test.used)} attempts left` : `Not taken · ${p.test.maxAttempts} attempts`}</span>
                  </span>
                  {p.test.passed ? <span className="text-[13px] font-bold">✓</span> : p.test.used < p.test.maxAttempts ? <Link href={`/learn/${p.slug}/test`} className={BTN}>Take the Test</Link> : <span className="text-[12px] text-ink-3">No attempts left</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>
        {certified.length === 0 && tests.length === 0 && <p className="mt-2 text-[13.5px] text-ink-2"><Link href="/learn/paths" className="font-bold underline">Find a learning path</Link> to work toward your first certificate.</p>}
      </div>
    </>
  );
}
