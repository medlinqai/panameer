import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { readServiceDescription } from "@/lib/service-description";
import { HOW_LONG } from "@/lib/hire-questionnaire";

// SD-E005: the saved Service Description in the standard order — What · Where · Type · Who · When · Rate — each with Edit.
const WORKSITE: Record<string, string> = { OFFSITE: "Offsite", ONSITE: "Onsite", HYBRID: "Hybrid" };

const lines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

function Section({ n, title, step, jobId, editable, children }: { n: number; title: string; step: number; jobId: string; editable: boolean; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0" data-sd-section={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">{n} · {title}</h3>
        {editable && <Link href={`/hire?job=${jobId}&step=${step}`} className="text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Edit</Link>}
      </div>
      <div className="mt-1.5 text-[14px]">{children}</div>
    </section>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return value ? <p><span className="text-ink-2">{label}:</span> {value}</p> : null;
}
function List({ label, text }: { label: string; text: string }) {
  return lines(text).length ? <div className="mt-1.5"><p className="text-ink-2">{label}</p><ul className="ml-5 list-disc">{lines(text).map((l, i) => <li key={i}>{l}</li>)}</ul></div> : null;
}

export async function ServiceDescriptionView({ jobId, editable, bare = false }: { jobId: string; editable: boolean; bare?: boolean }) {
  const sd = await readServiceDescription(jobId);
  if (!sd) return null;
  const role = sd.roleId ? await prisma.role.findUnique({ where: { id: sd.roleId }, select: { display: true, name: true } }) : null;
  const dollars = (n: number | null) => (n == null ? null : `$${n.toLocaleString("en-US")}`);
  const rate = sd.budgetMin != null || sd.budgetMax != null ? `${[dollars(sd.budgetMin), dollars(sd.budgetMax)].filter(Boolean).join(" – ")}${sd.budgetType === "FIXED" ? " fixed" : " / hr"}` : null;
  return (
    <div className={bare ? "py-0" : "mt-6 rounded-brand border border-line bg-white px-5 py-1"} data-service-description>
      <Section n={1} title="What" step={0} jobId={jobId} editable={editable}>
        <p className="font-bold">{sd.title}</p>
        {sd.summary && <p className="mt-1 text-ink-2">{sd.summary}</p>}
        <Row label="Category" value={sd.category} />
      </Section>
      <Section n={2} title="Where" step={1} jobId={jobId} editable={editable}>
        <p>{[sd.worksite ? WORKSITE[sd.worksite] : "Not set", [sd.city, sd.state, sd.country].filter(Boolean).join(", "), sd.onsiteDays ? `${sd.onsiteDays} day${sd.onsiteDays === 1 ? "" : "s"} a week onsite` : null].filter(Boolean).join(" · ")}</p>
      </Section>
      <Section n={3} title="Type" step={2} jobId={jobId} editable={editable}>
        {sd.contractTypes.length ? <p className="flex flex-wrap items-center gap-1.5">Contract: {sd.contractTypes.map((c) => <span key={c} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-2 text-[12.5px] font-semibold text-magenta-dark">{c}</span>)}</p> : <p className="text-ink-3">Not set</p>}
      </Section>
      <Section n={4} title="Who" step={3} jobId={jobId} editable={editable}>
        <Row label="Role" value={sd.specificRole || (role ? role.display || role.name : null)} />
        <Row label="Domain" value={sd.domains.join(", ")} />
        <Row label="Product" value={sd.product} />
        {(sd.skills.length > 0 || sd.customSkills.length > 0) && (
          <p className="mt-1 flex flex-wrap gap-1.5">{[...sd.skills.map((k) => k.name), ...sd.customSkills].map((k) => <span key={k} className="rounded-full border border-line bg-bg-soft px-2 text-[12.5px]">{k}</span>)}</p>
        )}
        <Row label="Experience" value={sd.years ? `${sd.years}+ years` : null} />
        <Row label="Education" value={sd.education} />
        <Row label="Credentials" value={sd.credentials.join(", ")} />
        <Row label="Specialties" value={sd.specialties.join(", ")} />
        <List label="Responsibilities" text={sd.responsibilities} />
        <List label="Required" text={sd.required} />
        <List label="Nice to have" text={sd.niceToHave} />
      </Section>
      <Section n={5} title="When" step={4} jobId={jobId} editable={editable}>
        <p>{[sd.startDate || sd.startText || "Start not set", sd.duration ? HOW_LONG.find((h) => h.value === sd.duration)?.label : null].filter(Boolean).join(" · ")}</p>
      </Section>
      <Section n={6} title="Rate" step={4} jobId={jobId} editable={editable}>
        <p>{rate ?? <span className="text-ink-3">Not set — add your budget</span>}</p>
      </Section>
    </div>
  );
}
