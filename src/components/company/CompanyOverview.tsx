import Link from "next/link";
import type { CompanyView } from "@/lib/company-view";
import { CompanySection, KV } from "@/components/company/CompanySection";
import { EditLink, type CompanyRole } from "@/components/company/CompanyShell";

// Overview = what buyers see: Website, Company name, Industry, Description. Legal and tax live on Legal, Tax & Banking.
export function CompanyDetailsRead({ c, role, editor }: { c: NonNullable<CompanyView>; role: CompanyRole; editor?: React.ReactNode }) {
  const buyer = role === "buyer";
  const site = c.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rows = [
    { k: "Website", v: site ? <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" className="text-magenta-dark hover:underline">{site}</a> : null },
    { k: "Company name", v: c.name },
    { k: "Industry", v: c.industry },
    { k: "Description", v: c.description, add: "Add · what the company does and for whom — shown on every proposal" },
  ];
  return (
    <CompanySection
      id="details"
      title="About the Company"
      tag={buyer ? undefined : "buyers see this"}
      actions={role === "admin" && !editor ? <EditLink href="/company?edit=details#details" /> : undefined}
    >
      {editor ?? <KV rows={buyer ? rows.filter((r) => r.v) : rows} />}
    </CompanySection>
  );
}

/** Admins only: what's left before the company can sign work orders (Your Path step 4); hidden when done. */
export function PayReadyBox({ c }: { c: NonNullable<CompanyView> }) {
  if (!c.payReady) return null;
  const form = taxFormLabel(c.country);
  const missing = [!c.ein?.trim() && "the tax ID", !c.taxForm?.uploadedAt && `the ${form}`].filter(Boolean) as string[];
  if (missing.length === 0) return null;
  return (
    <div data-pay-box={missing.length} className="mt-7 border border-ink p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="text-[15px] font-bold">
          Before {c.name} can be validated{" "}
          <span className="ml-1 inline-block border border-current px-[7px] align-[2px] text-[10.5px] font-bold tracking-[0.06em] text-[#b26b00]">
            {missing.length} LEFT
          </span>
        </p>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Add {missing.join(" and ")}. You can post and send proposals now. Private — admins only.
        </p>
      </div>
      <Link href="/company/legal" className="mt-3 inline-flex min-h-[42px] items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover sm:mt-0">
        <span className="sm:hidden">Finish</span>
        <span className="max-sm:hidden">Finish in Legal, Tax &amp; Banking</span>
      </Link>
    </div>
  );
}

export function CompanyVerification({ c, buyer = false, acceptTerms }: { c: NonNullable<CompanyView>; buyer?: boolean; acceptTerms?: React.ReactNode }) {
  const t = c.tos;
  const termsRow = {
    k: "Company terms",
    v: t.current ? (
      <span data-company-terms="accepted">
        Accepted{t.by ? ` by ${t.by}` : ""} · {t.acceptedAt!.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · v{t.version} ·{" "}
        <a href="/company-terms" className="font-semibold text-magenta-dark underline">Read them</a>
      </span>
    ) : (
      <span data-company-terms="pending">
        {t.acceptedAt ? `Accepted v${t.version}; the current version needs accepting again.` : "Not accepted yet — the company can't transact until it is."}{" "}
        <a href="/company-terms" className="font-semibold text-magenta-dark underline">Read them</a>
        {acceptTerms}
      </span>
    ),
  };
  const v = c.verification;
  const ok = v.status === "in_good_standing";
  const LABEL: Record<string, string> = {
    in_good_standing: "In good standing",
    has_issues: "On record, with issues",
    standing_unknown: "Found; standing not published",
    not_found: "Not found in the registry",
  };
  const needs = [!c.stateOfFiling && "STATE", !c.ein && "EIN"].filter(Boolean).join(" + ");
  return (
    <CompanySection id="verification" title="Verification">
      <KV
        rows={[
          {
            k: "Business entity",
            v: (
              <>
                {v.status ? LABEL[v.status] ?? v.status : "Not checked yet"}
                {v.detail && ` — ${v.detail}`}
                {v.checkedAt && ` · ${v.checkedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                {!buyer && !v.status && needs && <span className="ml-2 inline-block border border-current px-[7px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] text-[#b26b00]">NEEDS {needs}</span>}
                {ok && <span className="ml-2 inline-block border border-current px-[7px] align-[1px] text-[10.5px] font-bold tracking-[0.06em] text-[#1f8a5b]">VERIFIED</span>}
              </>
            ),
          },
          {
            k: "Source",
            v: v.source ? (
              <a href={v.source} target="_blank" rel="noopener noreferrer" className="text-magenta-dark hover:underline">
                State registry record
              </a>
            ) : (
              <span className="text-ink-2">{buyer ? "Not checked against a state registry yet" : "Checked against the state registry once state of filing is added"}</span>
            ),
          },
          ...(buyer ? [] : [termsRow]),
        ]}
      />
    </CompanySection>
  );
}

/** EIN / SSN shown as the last 4 only — the full number never reaches the page. */
export function maskTaxId(tin: string | null) {
  const d = (tin ?? "").replace(/\D/g, "");
  return d ? `•••••${d.slice(-4)}` : null;
}

/** Legal & Tax (admins only): legal name, business type, country, state, masked tax ID, registry check, company terms. */
export const taxFormLabel = (country: string | null | undefined) =>
  !country?.trim() || /^(us|usa|united states( of america)?)$/i.test(country.trim()) ? "W-9" : "W-8BEN-E";

export function LegalTaxRead({ c, editor, acceptTerms, taxLabel = "EIN", taxUpload }: { c: NonNullable<CompanyView>; editor?: React.ReactNode; acceptTerms?: React.ReactNode; taxLabel?: string; taxUpload?: React.ReactNode }) {
  const v = c.verification;
  const LABEL: Record<string, string> = {
    in_good_standing: "In good standing",
    has_issues: "On record, with issues",
    standing_unknown: "Found; standing not published",
    not_found: "Not found in the registry",
  };
  const t = c.tos;
  return (
    <CompanySection id="legal-tax" title="2 · Legal & Tax" actions={!editor ? <EditLink href="/company/legal?edit=legal#legal-tax" /> : undefined}>
      {editor ?? (
        <KV
          rows={[
            { k: "Legal name", v: c.legalName, add: `${c.name} · if it differs from the name buyers see` },
            { k: "Business type", v: c.taxType },
            { k: "Country", v: c.country },
            { k: "State of filing", v: c.stateOfFiling },
            { k: taxLabel, v: c.ein ? <span data-tax-id-masked>{maskTaxId(c.ein)}</span> : null, add: "Add · masked after saving" },
            {
              k: "Registry check",
              v: v.status ? (
                <span>
                  {LABEL[v.status] ?? v.status}
                  {v.detail && ` — ${v.detail}`}
                  {v.source && (
                    <>
                      {" · "}
                      <a href={v.source} target="_blank" rel="noopener noreferrer" className="text-magenta-dark hover:underline">State registry record</a>
                    </>
                  )}
                </span>
              ) : null,
              add: c.stateOfFiling ? "Not checked yet" : "Runs once the state is added",
            },
            {
              k: taxFormLabel(c.country),
              v: c.taxForm?.uploadedAt ? (
                <span data-tax-form>
                  On file · {c.taxForm.uploadedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {taxFormLabel(c.country) === "W-8BEN-E" && <span className="ml-1 text-ink-3">· Provided by company — not verified</span>}{" "}
                  {taxUpload}
                </span>
              ) : (
                <span>
                  <span className="italic text-ink-3">Not uploaded · </span>
                  {taxUpload}
                </span>
              ),
            },
            {
              k: "Company terms",
              v: t.current ? (
                <span data-company-terms="accepted">
                  Accepted{t.by ? ` by ${t.by}` : ""} · v{t.version} ·{" "}
                  <a href="/company-terms" className="font-semibold text-magenta-dark underline">Read them</a>
                </span>
              ) : (
                <span data-company-terms="pending">
                  {t.acceptedAt ? `Accepted v${t.version}; the current version needs accepting again.` : "Not accepted yet — the company can't transact until it is."}{" "}
                  <a href="/company-terms" className="font-semibold text-magenta-dark underline">Read them</a>
                  {acceptTerms}
                </span>
              ),
            },
          ]}
        />
      )}
    </CompanySection>
  );
}
