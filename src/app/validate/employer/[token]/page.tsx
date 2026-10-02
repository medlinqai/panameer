import { Logo } from "@/components/Logo";
import { getEmployerValidationRequest } from "@/lib/employer-validation";
import { EmployerValidateActions } from "@/components/validate/EmployerValidateActions";

/**
 * ── ⚠⚠ PUBLIC EMPLOYER-VALIDATION PAGE (`P2-A1.1-E747`, WS-B) ──────────────
 *
 * ⚠ **NO AUTH, by design** — a former manager or HR contact is not a Panameer
 * user and must not be asked to become one to answer a yes/no question. The
 * single-use token in the URL is the entire authorization.
 *
 * ⚠⚠⚠ **IT ONLY READS ON GET.** The answer is a POST from a real button click,
 * because corporate mail gateways pre-fetch links in incoming email — a GET that
 * confirmed would let a security scanner validate somebody's employment on the
 * contact's behalf, which is exactly the trust signal this is trying to earn.
 * ⚠ The project page states the same rule; this is the same rule, not a second
 * one.
 *
 * ⚠ **ITS OWN ROUTE, NOT A BRANCH ON `/validate/[token]`.** Two tables, two
 * tokens; a shared route would have to try both lookups on every request and
 * guess which kind of thing it was looking at.
 */
export default async function ValidateEmployerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decline?: string }>;
}) {
  const { token } = await params;
  const { decline } = await searchParams;
  const found = await getEmployerValidationRequest(token);

  return (
    <div className="flex min-h-screen flex-col bg-bg-soft font-body text-ink">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center">
          <Logo priority href={null} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12">
        {found && !found.alreadyAnswered ? (
          <EmployerValidateActions request={found} declineFirst={decline === "1"} />
        ) : (
          <div className="rounded-brand border border-line bg-white p-8 text-center">
            {/* ⚠⚠ ONE PAGE FOR "ANSWERED", "EXPIRED" AND "NOT A LINK". ⚠ Telling
                them apart would confirm to anyone holding a guessed token that a
                real request exists — and none of the three leaves the contact
                anything to do. */}
            <p className="text-[40px] leading-none" aria-hidden>
              {found?.alreadyAnswered ? "✓" : "⏳"}
            </p>
            <h1 className="mt-4 text-[24px]">
              {found?.alreadyAnswered
                ? "This one's already answered"
                : "This link has expired or isn't valid"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">
              {found?.alreadyAnswered
                ? "Thanks — someone has already responded to this request. There's nothing more to do."
                : "Validation links are good for 30 days. If you'd still like to respond, ask them to send a fresh one."}
            </p>
            <a
              href="https://panameer.com"
              className="mt-6 inline-block text-[14px] font-bold text-magenta hover:text-magenta-dark"
            >
              What Is Panameer? →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
