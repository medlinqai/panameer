import { Logo } from "@/components/Logo";
import { getValidationRequest } from "@/lib/project-validation";
import { ValidateActions } from "@/components/validate/ValidateActions";

export default async function ValidateProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ decline?: string }>;
}) {
  const { token } = await params;
  const { decline } = await searchParams;
  const found = await getValidationRequest(token);

  return (
    <div className="flex min-h-screen flex-col bg-bg-soft font-body text-ink">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center">
          <Logo priority href={null} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12">
        {found.ok ? (
          <ValidateActions
            request={found.request}
            declineFirst={decline === "1"}
          />
        ) : (
          <div className="rounded-brand border border-line bg-white p-8 text-center">
            <p className="text-[40px] leading-none" aria-hidden>
              {found.reason === "used" ? "✓" : "⏳"}
            </p>
            <h1 className="mt-4 text-[24px]">
              {found.reason === "used"
                ? "This one's already answered"
                : found.reason === "expired"
                  ? "This link has expired"
                  : "This link isn't valid"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-2">
              {found.reason === "used"
                ? "Thanks — someone has already responded to this request. There's nothing more to do."
                : found.reason === "expired"
                  ? "Validation links are good for 30 days. If you'd still like to respond, ask the provider to send a fresh one."
                  : "The link may have been copied incompletely. Try clicking it directly from the email again."}
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
