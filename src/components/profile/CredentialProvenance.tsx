import Link from "next/link";

export type CredentialProvenanceProps = {
  /** The discriminator that already existed — `CredentialSource`. */
  issuedFrom: string | null;
  /** Null on a self-reported row, and on an earned row that predates the id. */
  credentialId: string | null;
  className?: string;
};

export const PROVENANCE_EARNED = "Earned on Panameer";
export const PROVENANCE_SELF = "Self-reported";

export function CredentialProvenance({
  issuedFrom,
  credentialId,
  className = "",
}: CredentialProvenanceProps) {
  const earned = issuedFrom === "LEARN";

  if (earned && !credentialId) {
    return (
      <span className={"text-[12.5px] font-bold text-ink-2 " + className}>
        {PROVENANCE_EARNED}
      </span>
    );
  }

  if (earned) {
    return (
      <Link
        href={`/verify/${credentialId}`}
        className={"text-[12.5px] font-bold text-ink underline " + className}
      >
        {PROVENANCE_EARNED}
      </Link>
    );
  }

  return (
    <span className={"text-[12.5px] text-ink-2 " + className}>{PROVENANCE_SELF}</span>
  );
}
