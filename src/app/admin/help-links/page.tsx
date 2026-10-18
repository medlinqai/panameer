import { listHelpLinks } from "@/lib/help-links";
import { HelpLinksAdmin } from "@/components/admin/HelpLinksAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help Links · Admin · Panameer" };

// SH2-E008: Admin › Help Links — add, edit, reorder and turn off the links on /help.
export default async function Page() {
  const rows = await listHelpLinks(true);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <HelpLinksAdmin rows={rows.map((r) => ({ id: r.id, title: r.title, description: r.description, type: r.type, url: r.url, active: r.active, sample: r.sample }))} />
    </div>
  );
}
