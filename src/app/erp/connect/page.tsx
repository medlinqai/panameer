import Link from "next/link";
import { SETUP_IDENTITY, setupSecret } from "@/lib/erp/setup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect Your ERP · Panameer", description: "Set up Panameer as a punchout catalog in Oracle Cloud — the first punch-in sets your company up." };

// EO-E007: what to enter in Oracle Cloud › Manage Punchout Catalogs. The first punch-in from a new identity sets the company up.
// ES-E006: two steps — create the catalog with the public setup credential and punch in once; then swap in your own values.
const rowsFor = (password: string): [string, string][] => [
  ["Punchout URL", "https://app.panameer.com/api/cxml/punchout"],
  ["Protocol", "Direct cXML"],
  ["Domain", "NetworkID"],
  ["Identity", SETUP_IDENTITY],
  ["Password (Shared Secret)", password],
  ["Supplier ID (To)", "PANAMEER"],
  ["Image URL", "https://app.panameer.com/brand/panameer-oracle-catalog.png"],
];

export default async function Page() {
  const ROWS = rowsFor((await setupSecret()) ?? "Ask support@panameer.com for the setup password");
  return (
    <main className="mx-auto max-w-3xl px-4 py-12" data-erp-connect>
      <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">ORACLE CLOUD</p>
      <h1 className="mt-1 text-[30px] font-extrabold">Connect Your ERP</h1>
      <p className="mt-2 text-[15px] text-ink-2">Two steps: create the Panameer catalog with the public setup credential and punch in once to set up your company; then replace the Identity and Password with your own values from Panameer. The setup credential can&apos;t shop or place orders.</p>

      <h2 className="mt-8 text-[19px] font-extrabold">1. Create the Catalog With the Setup Credential</h2>
      <p className="mt-1 text-[14px] text-ink-2">In Oracle Cloud › Manage Punchout Catalogs, create a catalog with these values, Save, add it to a Content Zone you can see, then punch in once from Shop. You land on <b className="text-ink">Set Up Panameer</b>.</p>
      <div className="mt-3 overflow-x-auto rounded-[12px] border border-line">
        <table className="w-full text-[14px]">
          <tbody>
            {ROWS.map(([k, v]) => (
              <tr key={k} className="border-b border-line last:border-b-0">
                <th className="w-[220px] bg-bg-soft px-4 py-3 text-left font-bold">{k}</th>
                <td className="px-4 py-3 font-mono text-[13px] break-all">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-[19px] font-extrabold">2. Replace Identity and Password With Your Own</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] text-ink-2">
        <li>On Set Up Panameer, create your company. Panameer shows (and emails) your own <b className="text-ink">Identity</b> (PNM-…) and <b className="text-ink">Password</b>.</li>
        <li>Back in Manage Punchout Catalogs, replace the Identity and Password with those values, Save, and press <b className="text-ink">Test Connection</b>.</li>
        <li>Make sure the catalog is in the <b className="text-ink">Content Zone</b> your requesters use, then shop.</li>
      </ol>

      {/* WA-E005: the theme step — Panameer looks like your own Oracle pages for your people and punch-out shoppers. */}
      <h2 className="mt-8 text-[19px] font-extrabold">3. Your Theme</h2>
      <p className="mt-2 text-[15px] text-ink-2">Upload a screenshot of your Oracle home page and we&apos;ll read your header, accent and background colours and your logo — or enter them yourself. Approve the preview and your people (and punch-out shoppers) see it, with a small &quot;Powered by Panameer&quot; mark. <Link href="/company/theme" className="font-semibold underline">Set Your Theme →</Link></p>

      <h2 className="mt-8 text-[19px] font-extrabold">Watch How</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3" data-video-slots>
        {["Set Up the Punchout Catalog", "Show It on the Shopping Pages", "Add It to a Content Zone"].map((t) => (
          <div key={t} className="flex aspect-video flex-col items-center justify-center rounded-[12px] border border-dashed border-line bg-bg-soft text-center">
            <b className="text-[15px]">{t}</b>
            <span className="mt-1 text-[13px] text-ink-3">Video coming soon</span>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[13.5px] text-ink-2">Questions? Email support@panameer.com. Requester and approval rules stay in your ERP — Panameer returns each purchase to your requisition, and the Order follows your PO.</p>
    </main>
  );
}
