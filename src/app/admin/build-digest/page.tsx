import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";
import { digestRecipients } from "@/lib/build-digest";
import { DigestSend } from "@/components/admin/DigestSend";

export const dynamic = "force-dynamic";

export default async function BuildDigestPage() {
  const [drafts, recipients] = await Promise.all([
    prisma.buildDigest.findMany({ orderBy: { week: "desc" }, take: 10 }),
    digestRecipients(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <BackLink href="/admin" label="Admin" />
      <h1 className="mt-1 font-display text-[26px] font-bold">Follow the Build email</h1>
      <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-2">
        The Friday job writes a draft. Nothing is sent until you send it.
      </p>

      <p className="mt-4 border-t border-line pt-4 text-[14px] text-ink-2">
        <span className="font-display text-[22px] font-bold text-ink tabular-nums">
          {recipients.length}
        </span>{" "}
        {recipients.length === 1 ? "follower has" : "followers have"} asked for the weekly email.
        {recipients.length === 0 && " Sending now would reach nobody."}
      </p>

      {drafts.length === 0 ? (
        <p className="mt-6 text-[14px] text-ink-2">
          No draft yet. The Friday job has not run — or has not run since this page shipped.
        </p>
      ) : (
        drafts.map((d) => (
          <section key={d.id} className="mt-6 border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[17px] font-bold">Week of {d.week}</h2>
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
                {d.status === "SENT"
                  ? `Sent ${d.sent_at?.toISOString().slice(0, 10)} · ${d.sent_count} recipients`
                  : "Draft"}
              </span>
            </div>
            <p className="mt-2 text-[14px] font-semibold text-ink">{d.subject}</p>
            <pre className="mt-2 max-w-[70ch] whitespace-pre-wrap font-body text-[13.5px] leading-relaxed text-ink-2">
              {d.body}
            </pre>
            {d.status !== "SENT" && <DigestSend week={d.week} count={recipients.length} />}
          </section>
        ))
      )}
    </div>
  );
}
