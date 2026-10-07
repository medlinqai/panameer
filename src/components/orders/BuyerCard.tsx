import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BuyerTrackRecord } from "@/components/company/BuyerTrackRecord";
import { buyerProfileFor } from "@/lib/buyer-profile";
import { trackRecordForPerson } from "@/lib/buyer-track-record";

// What a provider sees of the buyer on a work order: the person, their company, and the Buyer Track Record.
export async function BuyerCard({ personId }: { personId: string }) {
  const [p, track] = await Promise.all([buyerProfileFor(personId), trackRecordForPerson(personId)]);
  if (!p) return null;
  const [first, ...rest] = p.name.split(" ");
  return (
    <section data-buyer-card className="mt-6 border border-line p-4">
      <p className="text-[11px] font-bold tracking-[0.1em] text-ink-3">THE BUYER</p>
      <div className="mt-2 flex items-center gap-3">
        <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={p.photoUrl} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{p.name}</p>
          <p className="truncate text-[13px] text-ink-2">
            {[p.title, p.company?.name].filter(Boolean).join(" · ")}
            {p.company && <> · <Link href={`/companies/${p.company.id}`} className="font-semibold underline">Company page</Link></>}
          </p>
        </div>
      </div>
      {p.overview && <p className="mt-2 line-clamp-3 text-[13.5px] text-ink-2">{p.overview}</p>}
      {track && <BuyerTrackRecord t={track} compact />}
    </section>
  );
}
