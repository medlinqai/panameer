import { isSuppressed, maskEmail, verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { findCategory } from "@/lib/notification-categories";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

/**
 * `/unsubscribe` — ONE CLICK, NO AUTH, WORKS WITH NO ACCOUNT (`P1-ALL-E386`).
 *
 * ⚠⚠ PUBLIC BY DESIGN AND EXPLICITLY ALLOWLISTED. `E371` made the seven senders
 * live, and every delivered email carried an Unsubscribe link pointing at
 * `/settings/notifications` — a route gated behind `canProvideServices`. So a
 * buyer was bounced, a signed-out recipient was bounced, and an address with no
 * account had no page at all.
 *
 * ⚠ A dead unsubscribe in DELIVERED mail is how a sending domain gets blocked,
 * and `mail.panameer.com` has no reputation yet to spend.
 *
 * ── ⚠ WHAT THIS PAGE DELIBERATELY DOES NOT DO ─────────────────────────────
 *
 * NO LOGIN. NO CONFIRMATION STEP. NO "manage your preferences" DETOUR. Every
 * one of those is a reason somebody marks the mail as spam instead — which
 * costs the sending domain far more than the unsubscribe would have.
 *
 * ⚠ THE ADDRESS IS MASKED. This URL may be forwarded, quoted in a reply or
 * pasted into a ticket; printing it in full turns a forwarded link into a
 * disclosure of who was on the list.
 *
 * ⚠ "UNSUBSCRIBE FROM EVERYTHING" IS A **SECONDARY** ACTION, OFFERED ONLY AFTER
 * THE PRIMARY ONE HAS ALREADY WORKED. Leading with it would turn one unwanted
 * category into total silence by default.
 *
 * ⚠⚠ AN INVALID OR FORGED TOKEN GETS A FLAT REFUSAL AND NO ACTION. A `Person`
 * uuid in a URL would have been an unsubscribe API for the whole platform; the
 * token is an HMAC over `email:category` — see `lib/unsubscribe.ts` for why that
 * mechanism and not the app's stored-hash token pattern.
 */
export const metadata = { title: "Unsubscribe · Panameer" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; c?: string; t?: string }>;
}) {
  const { e: email, c: category, t: token } = await searchParams;

  /* ⚠ THE TOKEN IS CHECKED BEFORE ANYTHING IS READ OR SHOWN — not after. */
  const ok =
    Boolean(email) && Boolean(token) && verifyUnsubscribeToken(email!, category ?? null, token!);

  if (!ok) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-[24px] font-bold">This link isn&apos;t valid</h1>
        {/* ⚠ IT DOES NOT SAY WHICH PART FAILED. "No such address" would make this
            page an address-existence oracle for anyone with a list to check. */}
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          The unsubscribe link may have been altered on its way here. You can
          change what Panameer emails you from your notification settings.
        </p>
      </main>
    );
  }

  const already = await isSuppressed(email!, category ?? undefined);
  const cat = category ? findCategory(category) : null;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-display text-[24px] font-bold">Unsubscribe</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {/* ⚠ MASKED — see the header. */}
        <span className="font-semibold text-ink">{maskEmail(email!)}</span>
        {cat ? (
          <>
            {" "}is receiving <span className="font-semibold text-ink">{cat.label}</span> emails.
          </>
        ) : (
          <> is receiving emails from Panameer.</>
        )}
      </p>

      <UnsubscribeForm
        email={email!}
        category={category ?? null}
        token={token!}
        categoryLabel={cat?.label ?? null}
        alreadyDone={already}
      />
    </main>
  );
}
