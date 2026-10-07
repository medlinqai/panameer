import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { publicGlossary } from "@/lib/glossary";
import { GlossaryBrowser } from "@/components/glossary/GlossaryBrowser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Glossary — Panameer",
  description: "The words Panameer uses — buyer, provider, work order, ERP and more — and what each one means.",
};

export default async function GlossaryPage() {
  const terms = await publicGlossary();
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-[900px] px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-[34px] font-bold leading-[1.15] tracking-[-0.6px] sm:text-[40px]">Glossary</h1>
        <p className="mt-3 max-w-[62ch] text-[16px] text-ink-2">The words we use on Panameer, what each one means, and the other names you may know it by.</p>
        <GlossaryBrowser terms={terms.map((t) => ({ id: t.id, term: t.term, category: t.category, type: t.type, definition: t.definition, alsoCalled: t.also_called }))} />
      </main>
      <MarketingFooter />
    </>
  );
}
