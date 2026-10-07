import { allGlossary } from "@/lib/glossary";
import { GlossaryAdmin } from "@/components/admin/GlossaryAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Glossary · Admin · Panameer" };

// Admin › Glossary: every term, public or admin-only, hidden or shown. Edited here, never in code.
export default async function AdminGlossaryPage() {
  const rows = await allGlossary();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <GlossaryAdmin
        rows={rows.map((r) => ({ id: r.id, term: r.term, category: r.category, type: r.type, definition: r.definition, alsoCalled: r.also_called, dontSay: r.dont_say, visibility: r.visibility, hidden: r.hidden, confirmNote: r.confirm_note }))}
      />
    </div>
  );
}
