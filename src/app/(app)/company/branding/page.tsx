import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { BrandingStudio } from "@/components/company/BrandingStudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company Branding · Panameer" };

// Company → Branding (admins only): logo, brand color, Dynamic Branding.
export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Fbranding");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");
  const c = await prisma.company.findUnique({
    where: { id: binding.company.id },
    select: { id: true, name: true, logo_url: true, brand_hue: true, theme_recipe: true, theme_enabled: true, logo_palette: true },
  });
  if (!c) redirect("/company");
  return <BrandingStudio companyId={c.id} companyName={c.name} logoUrl={c.logo_url} brandHue={c.brand_hue} themeRecipe={c.theme_recipe} themeEnabled={c.theme_enabled} palette={Array.isArray(c.logo_palette) ? (c.logo_palette as string[]) : []} />;
}
