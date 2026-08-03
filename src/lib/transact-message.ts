import type { TransactDenial } from "@/lib/access";

/**
 * What to TELL someone the company gate turned away (brief_company_model WS4).
 *
 * One table so the API and the page say the same thing, and so every refusal
 * names the next action. "Forbidden" against a gate the user can clear in two
 * clicks reads as a broken product.
 */
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
