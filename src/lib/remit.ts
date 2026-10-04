// R1: buyers pay Panameer Inc offline. Real details come from env (Vercel); until then members see "to follow".
export type RemitInstructions = {
  payee: string;
  bankName: string | null;
  accountName: string | null;
  routingNumber: string | null;
  accountNumber: string | null;
  swift: string | null;
  bankAddress: string | null;
  contactEmail: string;
  configured: boolean;
};

const env = (k: string) => process.env[k]?.trim() || null;

export function remitInstructions(): RemitInstructions {
  const r = {
    payee: env("PANAMEER_REMIT_PAYEE") ?? "Panameer Inc",
    bankName: env("PANAMEER_REMIT_BANK_NAME"),
    accountName: env("PANAMEER_REMIT_ACCOUNT_NAME"),
    routingNumber: env("PANAMEER_REMIT_ROUTING"),
    accountNumber: env("PANAMEER_REMIT_ACCOUNT"),
    swift: env("PANAMEER_REMIT_SWIFT"),
    bankAddress: env("PANAMEER_REMIT_BANK_ADDRESS"),
    contactEmail: env("PANAMEER_REMIT_CONTACT") ?? "hello@panameer.com",
  };
  return { ...r, configured: !!(r.bankName && r.routingNumber && r.accountNumber) };
}
