import Link from "next/link";
import { taxonomyV2 } from "@/lib/platform-settings";
import { capabilitiesFor } from "@/lib/capabilities";

// GT-E004: "Supports Oracle Fusion Cloud Payables · Invoice Processing & Matching" on the profile (behind taxonomy_v2).
// Visitors see confirmed lines; the owner also sees the ones from their skills, with Confirm.
export async function CapabilityLines({ profileId, owner }: { profileId: string; owner: boolean }) {
  if (!(await taxonomyV2())) return null;
  const caps = (await capabilitiesFor(profileId)).filter((c) => owner || c.confirmed);
  if (!caps.length && !owner) return null;
  const unconfirmed = caps.filter((c) => !c.confirmed).length;
  return (
    <section data-capability-lines className="mb-4 border border-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-bold">What I Do</h2>
        {owner && <Link href="/profile/edit/skills" className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">{unconfirmed ? `Confirm ${unconfirmed}` : "Edit"}</Link>}
      </div>
      {caps.length ? (
        <ul className="mt-1.5 text-[14px]">
          {caps.slice(0, owner ? 50 : 12).map((c) => (
            <li key={c.id} className="border-t border-[#ECEEF4] py-1.5">
              {c.line}
              {owner && !c.confirmed && <Link href="/profile/edit/skills" data-confirm-link className="ml-2 text-[12px] font-bold text-magenta-dark underline">Confirm</Link>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[13.5px] text-ink-2">Say how you work with what you know: implement, support or do the work. <Link href="/profile/edit/skills" className="font-semibold underline">Add</Link></p>
      )}
    </section>
  );
}
