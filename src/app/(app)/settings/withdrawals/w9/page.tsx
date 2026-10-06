import { guardPage } from "@/lib/guard";
import { getWithdrawals, logTaxFormAccess } from "@/lib/settings";
import { FORM_LABEL } from "@/lib/tax";
import { BackLink } from "@/components/console/BackLink";

export const metadata = { title: "Substitute Form W-9 · Panameer" };

export default async function W9HardCopyPage() {
  const viewer = await guardPage("canProvideServices");
  const { tax } = await getWithdrawals(viewer);
  await logTaxFormAccess(viewer, tax?.form ?? "W9", "VIEW");

  if (!tax || tax.form !== "W9") {
    return (
      <div className="mx-auto max-w-2xl px-1 py-6">
        <h1 className="font-display text-[22px] font-bold">No Form W-9 on file</h1>
        <p className="mt-2 text-[14.5px] text-ink-2">
          {tax
            ? `This account's tax form is ${FORM_LABEL[tax.form]}, not a Form W-9.`
            : "Nothing has been signed yet."}
        </p>
        <BackLink href="/settings/withdrawals" label="Withdrawals" />
      </div>
    );
  }

  const row = (label: string, value: string) => (
    <div className="grid grid-cols-[190px_1fr] gap-3 border-b border-line py-2.5">
      <dt className="text-[12px] font-bold uppercase tracking-[0.05em] text-ink-2">{label}</dt>
      <dd className="text-[14px]">{value}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-1 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackLink href="/settings/withdrawals" label="Withdrawals" />
        <p className="text-[13px] text-ink-2">Use your browser&apos;s Print to save a copy.</p>
      </div>

      <article className="rounded-brand border border-line bg-white p-7">
        <header className="border-b-2 border-ink pb-3">
          <h1 className="font-display text-[21px] font-extrabold">
            Substitute Form W-9
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Request for Taxpayer Identification Number and Certification — captured
            electronically by Panameer Inc.
          </p>
        </header>

        <dl className="mt-4">
          {row("Name", tax.legal_name)}
          {row(
            "Federal tax classification",
            tax.classification ? tax.classification.replace(/_/g, " ") : "Not recorded"
          )}
          {row("Taxpayer ID type", tax.tin_kind ?? "Not recorded")}
          {/* LAST FOUR ONLY — the full number is not stored. */}
          {row(
            "Taxpayer identification number",
            tax.tin_last4 ? `•••••${tax.tin_last4}` : "Not recorded"
          )}
          {row("Country of tax residence", tax.country)}
        </dl>

        {/* THE STORED TEXT, VERBATIM, IN A BOX. This is what the signer saw. */}
        <section className="mt-5 rounded-[10px] border-2 border-ink/25 p-4">
          <h2 className="text-[12px] font-extrabold uppercase tracking-[0.06em]">
            Certification
          </h2>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed">
            {tax.certification_text ??
              "No certification text is recorded for this form. It was signed before Panameer captured the certification wording."}
          </p>
        </section>

        <section className="mt-5">
          {row("Signature (typed)", tax.signed_name)}
          {row("Signed", tax.signed_at.toISOString().replace("T", " ").slice(0, 19) + " UTC")}
          {row(
            "Certified",
            tax.certified_at
              ? tax.certified_at.toISOString().replace("T", " ").slice(0, 19) + " UTC"
              : "Not recorded"
          )}
          {row("Certification revision", tax.certification_version ?? "Not recorded")}
        </section>
      </article>
    </div>
  );
}
