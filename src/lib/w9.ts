
export const W9_CERTIFICATION_VERSION = "irs-w9-rev-2024-03";

/** IRS Form W-9, Part II. Verbatim. */
export const W9_CERTIFICATION_PREAMBLE = "Under penalties of perjury, I certify that:";

export const W9_CERTIFICATIONS: readonly string[] = [
  "1. The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and",
  "2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and",
  "3. I am a U.S. citizen or other U.S. person (defined below); and",
  "4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.",
];

export const W9_CONSENT_NOTICE =
  "The IRS does not require your consent to any provision of this document other than the certifications required to avoid backup withholding.";

export function w9CertificationText(): string {
  return [W9_CERTIFICATION_PREAMBLE, ...W9_CERTIFICATIONS, W9_CONSENT_NOTICE].join("\n\n");
}

/** What gets written when somebody signs. */
export type W9Signature = {
  signedName: string;
  certificationText: string;
  certificationVersion: string;
  certifiedAt: Date;
};

export function w9Signature(signedName: string, now = new Date()): W9Signature {
  return {
    signedName: signedName.trim(),
    certificationText: w9CertificationText(),
    certificationVersion: W9_CERTIFICATION_VERSION,
    certifiedAt: now,
  };
}

export const W8_STUB_NOTICE =
  "Panameer cannot collect this form online yet. A non-US payee files Form W-8BEN (individual) or Form W-8BEN-E (entity), and we will contact you to complete it before any payment is made.";
