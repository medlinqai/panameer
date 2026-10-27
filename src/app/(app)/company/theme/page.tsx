import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { getCompanyBinding } from "@/lib/company";
import { prisma } from "@/lib/prisma";
import { ThemeStudio } from "@/components/company/ThemeStudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Theme · Panameer" };

// WA-E005: Your Theme — part of ERP / punch-out set-up and here under Company (admins only).
export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany%2Ftheme");
  const binding = await getCompanyBinding(viewer);
  if (!binding?.isAdmin) redirect("/company");
  const c = await prisma.company.findUnique({ where: { id: binding.company.id }, select: { name: true, theme_header_hex: true, theme_accent_hex: true, theme_background_hex: true, theme_logo_url: true, theme_background_url: true, theme_approved_at: true, logo_url: true } });
  if (!c) redirect("/company");
  return (
    <div className="mx-auto w-full max-w-4xl" data-your-theme>
      <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">COMPANY</p>
      <h1 className="mt-1 text-[28px] font-extrabold">Your Theme</h1>
      <p className="mt-1 text-[14px] text-ink-2">Make Panameer look like {c.name}&apos;s own Oracle pages for your people and your punch-out shoppers.</p>
      <ThemeStudio initial={{ header: c.theme_header_hex ?? "", accent: c.theme_accent_hex ?? "", background: c.theme_background_hex ?? "", logoUrl: c.theme_logo_url ?? c.logo_url ?? "", backgroundUrl: c.theme_background_url ?? "", approved: !!c.theme_approved_at }} />
    </div>
  );
}
