import { listHelpLinks } from "@/lib/help-links";
import { HelpLinksAdmin } from "@/components/admin/HelpLinksAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Informational Items · Admin · Panameer" };

// II-E001: Admin › Informational Items (table help_links) — add, edit, reorder and turn off the items on /help.
export default async function Page() {
  const rows = await listHelpLinks(true);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <HelpLinksAdmin rows={rows.map((r) => ({ id: r.id, title: r.title, description: r.description, keywords: r.keywords, type: r.type, url: r.url, active: r.active, sample: r.sample }))} />
    </div>
  );
}
