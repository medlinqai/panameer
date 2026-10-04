import type { TransactDenial } from "@/lib/access";

export const TRANSACT_MESSAGE: Record<TransactDenial, string> = {
  NO_COMPANY:
    "You need to be part of a company before you can do this. Add yours, or join the one you work for.",
  PENDING_APPROVAL:
    "Your request to join that company is still waiting on its admin. You can transact as soon as they approve it.",
  REJECTED:
    "That company declined your request to join. Choose a different company, or add your own.",
  COMPANY_TOS:
    "Your company hasn't accepted the Panameer company terms yet. A company admin can accept them on the company page.",
};
