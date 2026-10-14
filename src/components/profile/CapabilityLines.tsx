import Link from "next/link";
import { taxonomyV2 } from "@/lib/platform-settings";
import { capabilitiesFor, MODE_VERB } from "@/lib/capabilities";

type Cap = Awaited<ReturnType<typeof capabilitiesFor>>[number];

// GT-E004 (Scott 10-14): "What I Do" sits where Skills was, grouped so it scans:
// Implements · Oracle Fusion Cloud  →  Procure-to-Pay: Purchase Orders · Requisitions · Payables …
// Visitors see confirmed items; the owner also sees the ones from their old skills (dashed = waiting for Confirm).
function group(caps: Cap[]) {
  const heads = new Map<string, Map<string, Cap[]>>();
  for (const c of caps) {
    const head = c.system ? `${MODE_VERB[c.mode]} · ${c.system}` : MODE_VERB[c.mode];
    const proc = c.process ?? "Other";
    if (!heads.has(head)) heads.set(head, new Map());
    const m = heads.get(head)!;
    if (!m.has(proc)) m.set(proc, []);
    m.get(proc)!.push(c);
  }
  return [...heads.entries()].map(([head, m]) => ({ head, processes: [...m.entries()].map(([process, items]) => ({ process, items })) }));
}

export async function CapabilityLines({ profileId, owner }: { profileId: string; owner: boolean }) {
  if (!(await taxonomyV2())) return null;
  const caps = (await capabilitiesFor(profileId)).filter((c) => owner || c.confirmed);
  if (!caps.length && !owner) return null;
  const unconfirmed = caps.filter((c) => !c.confirmed).length;
  return (
    <section data-capability-lines className="border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-bold">What I Do</h2>
        {owner && <Link href="/profile/edit/skills" className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">{unconfirmed ? `Confirm ${unconfirmed}` : "Edit"}</Link>}
      </div>
      {owner && unconfirmed > 0 && <p className="mt-0.5 text-[12.5px] text-ink-3">Dashed items came from your skills. Confirm how you work with them.</p>}
      {caps.length ? (
        <div className="mt-2 space-y-3">
          {group(caps).map((g) => (
            <div key={g.head}>
              <p className="text-[14px] font-bold">{g.head}</p>
              {g.processes.map((p) => (
                <div key={p.process} className="mt-1 flex flex-wrap items-baseline gap-1.5">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">{p.process}</span>
                  {p.items.map((c) => (
                    <span key={c.id} title={c.line} data-cap-chip className={`border px-2 py-0.5 text-[12.5px] ${c.confirmed ? "border-line bg-white" : "border-dashed border-magenta/60 text-ink-2"}`}>{c.label}</span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[13.5px] text-ink-2">Say how you work with what you know: implement, support or do the work. <Link href="/profile/edit/skills" className="font-semibold underline">Add</Link></p>
      )}
    </section>
  );
}
