import { isSuppressed, maskEmail, verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { findCategory } from "@/lib/notification-categories";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata = { title: "Unsubscribe · Panameer" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; c?: string; t?: string }>;
}) {
  const { e: email, c: category, t: token } = await searchParams;

  const ok =
    Boolean(email) && Boolean(token) && verifyUnsubscribeToken(email!, category ?? null, token!);

  if (!ok) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="font-display text-[24px] font-bold">This link isn&apos;t valid</h1>
        {}
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
        {}
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
