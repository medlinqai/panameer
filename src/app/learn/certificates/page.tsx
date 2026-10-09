import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { viewerTeaches } from "@/lib/learn-home";
import { learnCatalog } from "@/lib/learn-catalog";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { CredentialsBody } from "@/components/profile/CredentialsBody";

export const metadata = { title: "Certificates — Panameer", description: "Your Learn certificates and certification tests." };
export const dynamic = "force-dynamic";

// T-E001: Certificates is its own page (moved from My Learning): certificates | tests.
export default async function CertificatesPage() {
  const viewer = await memberOrPublicTwin("/learn");
  const [paths, teaches] = await Promise.all([learnCatalog(viewer.userId), viewerTeaches(viewer)]);
  const certified = paths.filter((p) => p.certificate);
  const tests = paths.filter((p) => p.test.ready && (p.mine || p.test.used > 0 || p.certificate));
  const row = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5";
  const BTN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";
  return (
    <>
      <LearnTabs active="certificates" teaches={teaches} />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learn-certificates>
        <h1 className="text-[28px] font-bold">Certificates</h1>
        <p className="mt-1 text-[14px] text-ink-2">Certificates show on your profile under <b className="text-ink">Credentials</b>. Pass a path&apos;s test to earn one.</p>
        <div className="mt-2 grid md:grid-cols-2">
          <section className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[20px] font-bold">Certificates <small className="ml-1 text-[12px] font-medium text-ink-3">{certified.length}</small></h2>
            <div className="mt-2">
              <CredentialsBody
                credentials={[
                  ...certified.map((p) => ({ id: p.certificate!.id, name: p.title, issuer: "Panameer", issuedOn: p.certificate!.earnedOn.slice(0, 10), issuedFrom: "LEARN", kind: "CERTIFICATION", publicUrl: p.certificate!.verifyUrl, credentialId: p.certificate!.id })),
                ]}
                empty="No certificates yet."
              />
              <p className="mt-2 text-[12px] text-ink-3">Same chips as Credentials on your profile. Tap one to see the date, score and verification link.</p>
            </div>
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
