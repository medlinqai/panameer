import { BRAND_GRADIENT, issuedLabel } from "@/lib/certificate-links";

// L-E056: the certificate on the brand gradient — mark, CERTIFIED, path, member, date, credential ID, score.
export function CertificateCard({ title, holder, issuedOn, credentialId, score, correct, total, size = "lg" }: { title: string; holder: string; issuedOn: Date | string; credentialId: string; score?: number | null; correct?: number | null; total?: number | null; size?: "lg" | "thumb" }) {
  const lg = size === "lg";
  return (
    <div data-certificate-card className={"relative overflow-hidden text-white " + (lg ? "p-7 sm:p-10" : "aspect-[1200/630] p-4")} style={{ background: BRAND_GRADIENT }}>
      <span aria-hidden className={"pointer-events-none absolute -right-6 -top-10 font-extrabold leading-none opacity-[0.08] " + (lg ? "text-[220px]" : "text-[110px]")}>P</span>
      <div className="relative flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/panameer-lockup-white.png" alt="Panameer" className={lg ? "h-7 w-auto" : "h-4 w-auto"} />
      </div>
      <p className={"relative font-extrabold tracking-[0.28em] text-[#F3B6F0] " + (lg ? "mt-8 text-[13px]" : "mt-3 text-[9px]")}>CERTIFIED</p>
      <p className={"relative font-bold leading-tight " + (lg ? "mt-2 text-[34px] sm:text-[42px]" : "mt-1 line-clamp-2 text-[17px]")}>{title}</p>
      <p className={"relative text-white/85 " + (lg ? "mt-4 text-[18px]" : "mt-1.5 truncate text-[12px]")}>{holder}</p>
      <div className={"relative flex flex-wrap gap-x-6 gap-y-1 text-white/75 " + (lg ? "mt-6 text-[13.5px]" : "mt-2 text-[10px]")}>
        <span>Issued {issuedLabel(issuedOn)}</span>
        {lg && <span className="font-mono">Credential {credentialId}</span>}
        {lg && score != null && <span>{score}%{correct != null && total ? ` · ${correct} of ${total}` : ""}</span>}
      </div>
    </div>
  );
}
