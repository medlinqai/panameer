export const metadata = { title: "Connect Your ERP · Panameer", description: "Set up Panameer as a punchout catalog in Oracle Cloud — the first punch-in sets your company up." };

// EO-E007: what to enter in Oracle Cloud › Manage Punchout Catalogs. The first punch-in from a new identity sets the company up.
const ROWS: [string, string][] = [
  ["Punchout URL", "https://app.panameer.com/api/cxml/punchout"],
  ["Protocol", "Direct cXML"],
  ["Domain", "NetworkID"],
  ["Identity", "Your own — e.g. ACME-ERP (the same From and Sender identity)"],
  ["Password (Shared Secret)", "Your own — at least 16 characters; the first punch-in locks it to your identity"],
  ["Supplier ID (To)", "PANAMEER"],
  ["Image URL", "https://app.panameer.com/brand/panameer-oracle-catalog.png"],
];

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12" data-erp-connect>
      <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">ORACLE CLOUD</p>
      <h1 className="mt-1 text-[30px] font-extrabold">Connect Your ERP</h1>
      <p className="mt-2 text-[15px] text-ink-2">Add Panameer as a punchout catalog. Your first punch-in sets your company up on Panameer — you become its admin, and we email you a link to confirm the company and set a password. You can shop right away.</p>

      <h2 className="mt-8 text-[19px] font-extrabold">1. In Oracle Cloud › Manage Punchout Catalogs</h2>
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

      <h2 className="mt-8 text-[19px] font-extrabold">2. Test Connection, Add to a Content Zone, Shop</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px] text-ink-2">
        <li>Press <b className="text-ink">Test Connection</b> — Oracle sends a setup request and should show the Panameer shop.</li>
        <li>Add the catalog to a <b className="text-ink">Content Zone</b> your requesters use.</li>
        <li>Open Shop in Oracle, pick Panameer, and shop. Your first punch-in sets up your company; check your email for the confirm link.</li>
      </ol>

      <h2 className="mt-8 text-[19px] font-extrabold">Watch How</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2" data-video-slots>
        {["Set Up the Punchout Catalog", "Your First Punch-In"].map((t) => (
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
