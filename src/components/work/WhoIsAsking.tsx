import { BadgeCheck, CircleDashed } from "lucide-react";
import { CompanyLink } from "@/components/company/CompanyLink";
import { Avatar } from "@/components/Avatar";
import { standingLine, type BuyerIdentity } from "@/lib/work-request-identity";

export function WhoIsAsking({ identity }: { identity: BuyerIdentity }) {
  const {
    personName,
    personFirstName,
    personLastName,
    personTitle,
    personPhotoUrl,
    companyName,
    companyCodeName,
    companyConfidential,
    companyId,
    companyCountry,
    companyVertical,
    companyLogoUrl,
    standing,
    verification,
  } = identity;

  const companyLabel = companyConfidential
    ? (companyCodeName ?? "Company withheld")
    : companyName;

  const companyMeta = [companyVertical, companyCountry].filter(Boolean).join(" · ");

  return (
    <section
      aria-label="Who's asking"
      className="rounded-[12px] border border-line bg-bg-soft p-4"
    >
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
        Who&rsquo;s Asking
      </p>

      {/* 1 — the person */}
      <div className="flex items-center gap-3">
        <Avatar firstName={personFirstName} lastName={personLastName} photoUrl={personPhotoUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{personName ?? "—"}</p>
          {personTitle && (
            <p className="truncate text-[12.5px] text-ink-2">{personTitle}</p>
          )}
        </div>
      </div>

      {/* 2 — the company */}
      <div className="mt-3 flex items-center gap-2.5">
        {companyLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyLogoUrl}
            alt=""
            className="h-6 w-6 shrink-0 rounded-[5px] object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">
            {companyLabel && !companyConfidential ? <CompanyLink id={companyId} name={companyLabel} /> : (companyLabel ?? "—")}
          </p>
          {}
          {companyConfidential && (
            <p className="text-[12.5px] leading-snug text-ink-2">
              Hiring confidentially
            </p>
          )}
          {companyMeta && (
            <p className="truncate text-[12.5px] text-ink-2">{companyMeta}</p>
          )}
        </div>
      </div>

      {/* 3 — standing */}
      <p className="mt-3 text-[12.5px] text-ink-2">{standingLine(standing)}</p>

      {}
      <ul className="mt-3 grid gap-2 border-t border-line pt-3">
        {verification.map((v) => {
          const ok = v.state === "verified";
          const Icon = ok ? BadgeCheck : CircleDashed;
          return (
            <li key={v.key} className="flex gap-2">
              <Icon
                className={`mt-[1px] h-4 w-4 shrink-0 ${ok ? "text-emerald-700" : "text-ink-2/70"}`}
                aria-hidden
              />
              <span className="min-w-0 text-[12.5px] leading-relaxed">
                <b className={ok ? "text-emerald-800" : "text-ink"}>{v.label}</b>
                <span className="text-ink-2"> — {v.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
