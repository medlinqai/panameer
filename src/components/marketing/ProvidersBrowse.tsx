import { Eyebrow, H2, Lead } from "@/components/marketing/section";

/**
 * "Find Service Providers for Every Application" — the coverage claim
 * (E028(i)).
 *
 * SPLIT OUT OF HowItWorks. One section used to carry three unrelated things
 * under a single "How it works" eyebrow: this grid, four process steps, and the
 * heading for both. They answer different questions — this one is "do you cover
 * what I run?", which is a browse, not a process — and a visitor scanning for
 * either had to read past the other.
 *
 * The eyebrow went with the steps, where it belongs.
 *
 * THE TILES ARE LABELS, NOT LINKS, and that is honest rather than unfinished:
 * there is no public per-application browse to send anyone to. They are the
 * evidence behind the claim in the heading. When an application page exists,
 * this array is already the list.
 */
const APPS = [
  "Inventory Mgmt.",
  "Procurement",
  "Financials Mgmt.",
  "Project Portfolio Mgmt.",
  "Core Human Resources",
  "Manufacturing",
  "Supply Chain Planning",
  "Financial Close",
];

export function ProvidersBrowse() {
  return (
    <section id="providers" className="py-[76px]">
      <div className="mx-auto max-w-[1180px] px-6">
        <Eyebrow>Providers</Eyebrow>
        <H2>Find Service Providers for Every Application</H2>
        <Lead>
          Experts across the full enterprise stack — matched to exactly what you
          need done.
        </Lead>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {APPS.map((app) => (
            <div
              key={app}
              className="rounded-brand border border-line bg-white px-[18px] py-4 text-[15px] font-bold transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand"
            >
              {app}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
