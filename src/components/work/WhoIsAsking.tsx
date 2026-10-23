import { BadgeCheck, CircleDashed } from "lucide-react";
import { CompanyLink } from "@/components/company/CompanyLink";
import { VerifiedTag } from "@/components/company/VerifiedTag";
import { Avatar } from "@/components/Avatar";
import { standingLine, type BuyerIdentity } from "@/lib/work-request-identity";
import { CompanyLogoTile } from "@/components/company/CompanyLogoTile";
import { BuyerTrackRecord } from "@/components/company/BuyerTrackRecord";

export function WhoIsAsking({ identity }: { identity: BuyerIdentity }) {
  const {
    personName,
    personFirstName,
    personLastName,
    personTitle,
    personPhotoUrl,
    companyConfidential,
    companyId,
    companyCountry,
    companyVertical,
    companyLogoUrl,
    standing,
    verification,
  } = identity;

  const { companyLabel } = identity;

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
        {companyLogoUrl && <CompanyLogoTile src={companyLogoUrl} alt="" className="h-7 w-12 shrink-0 border border-line" pad="2px" />}
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">
            {companyLabel && !companyConfidential ? <CompanyLink id={companyId} name={companyLabel} /> : (companyLabel ?? "—")}
            {!companyConfidential && <VerifiedTag companyId={companyId} />}
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
      {/* PJ-E004: compact — verification as small chips and the track record as one line; the full text behind More. */}
      <div className="mt-3 flex flex-wrap gap-1.5" data-who-chips>
        {verification.map((v) => {
          const ok = v.state === "verified";
          return <span key={v.key} title={v.detail} className={ok ? "inline-flex items-center gap-1 rounded-full bg-state-accepted-bg px-2 py-0.5 text-[11.5px] font-bold text-state-accepted" : "inline-flex items-center gap-1 rounded-full bg-state-inactive-bg px-2 py-0.5 text-[11.5px] font-bold text-state-inactive"}>{ok ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5" aria-hidden />}{v.label}</span>;
        })}
      </div>
      {identity.track && <p className="mt-2 text-[12.5px] text-ink-2" data-track-line>{identity.track.issued} Order{identity.track.issued === 1 ? "" : "s"} · {identity.track.completed} Completed{identity.track.paidOnTimePct != null ? ` · ${identity.track.paidOnTimePct}% paid on time` : ""}</p>}
      <details className="group mt-2 text-[12.5px]" data-who-more>
        <summary className="cursor-pointer list-none font-semibold text-ink-2 underline underline-offset-4 [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">More</span><span className="hidden group-open:inline">Less</span></summary>
        <p className="mt-2 text-ink-2">{standingLine(standing)}</p>
        <ul className="mt-2 grid gap-2 border-t border-line pt-2">
          {verification.map((v) => (
            <li key={v.key} className="leading-relaxed"><b className={v.state === "verified" ? "text-state-accepted" : "text-ink"}>{v.label}</b><span className="text-ink-2"> — {v.detail}</span></li>
          ))}
        </ul>
        {identity.track && <BuyerTrackRecord t={identity.track} compact />}
      </details>
    </section>
  );
}
