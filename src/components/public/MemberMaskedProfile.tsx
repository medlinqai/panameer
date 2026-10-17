import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaskedProfile } from "@/lib/masked-profile";

// SH-E005: what a signed-in buyer sees of talent they haven't matched with yet — the work, never the name, photo, contact or rate.
export async function MemberMaskedProfile({ id, seesTest }: { id: string; seesTest: boolean }) {
  const p = await getMaskedProfile(id, { seesTest });
  if (!p) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl" data-member-masked>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-3"><Link href="/hire" className="hover:text-magenta">Hire Talent</Link></p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-bg-soft text-ink-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-8 w-8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
        </span>
        <div>
          <h1 className="text-[24px] font-extrabold leading-tight">{p.title}</h1>
          <p className="text-[14px] text-ink-2">{[p.location, p.experience ? `${p.experience} experience` : null].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {p.summary && <p className="mt-4 text-[15px] leading-relaxed">{p.summary}</p>}
      {p.skills.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">Skills</h2>
          <p className="flex flex-wrap gap-1.5">{p.skills.map((k) => <span key={k} className="border border-line bg-bg-soft px-2 py-0.5 text-[13px]">{k}</span>)}</p>
        </section>
      )}
      {p.certifications.length > 0 && <p className="mt-4 text-[14px]"><b>Certifications:</b> {p.certifications.join(" · ")}</p>}
      <div className="mt-6 rounded-[10px] bg-[#FBEAFB] p-4 text-[14px]">
        <b>Name, photo, contact and rates show after you match.</b> Tell us who you need, for how long and your budget — we&apos;ll match you and show you names.
        <Link href="/hire" className="mt-3 flex min-h-10 max-w-[240px] items-center justify-center bg-ink px-4 text-[13.5px] font-bold text-surface hover:bg-ink-hover">Tell us what you need</Link>
      </div>
    </div>
  );
}
