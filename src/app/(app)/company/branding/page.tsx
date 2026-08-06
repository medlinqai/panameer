import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { BrandingEditor } from "@/components/company/BrandingEditor";

/**
 * Company Branding (E204) — replaces the ComingSoon stub the flatten brief left.
 *
 * ADMIN-ONLY, on the same predicate as the Company chip that offers the link:
 * an APPROVED membership with the ADMIN role. The chip hides the menu for
 * everyone else and this redirects them, because a page that renders for
 * someone whose save will be rejected is a worse experience than one that never
 * opens.
 */
export const metadata = { title: "Company Branding · Panameer" };

export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fbranding");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");

  const company = await prisma.company.findUnique({
    where: { id: binding.company.id },
    select: { name: true, logo_url: true, brand_hue: true, theme_recipe: true },
  });
  if (!company) redirect("/company");

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.4px]">
        Branding
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Your logo sets your colour, and your colour themes the console for
        everyone at {company.name}. Panameer picks the structure so the result is
        always readable.
      </p>

      <div className="mt-7">
        <BrandingEditor
          companyName={company.name}
          logoUrl={company.logo_url}
          initialHue={company.brand_hue}
          initialRecipe={company.theme_recipe}
        />
      </div>
    </div>
  );
}
