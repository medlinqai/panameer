import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getHelpLink, viewerSrc } from "@/lib/help-links";
import { HelpTypeIcon } from "@/components/help/HelpTypeIcon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help · Panameer" };

// SH2-E008: a Help link inside Panameer — YouTube embed, PDF inline, Word via the Office viewer, a page in a frame;
// where the source refuses frames (Instagram and many sites), a card that opens it in a new tab.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("authenticated");
  const link = await getHelpLink((await params).id);
  if (!link) notFound();
  const src = await viewerSrc(link);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col">
      <p className="mt-2 text-[13px]"><Link href="/help" className="font-semibold text-magenta-dark">← Back to Help</Link></p>
      <h1 className="mt-1 flex items-center gap-2 text-[22px] font-extrabold"><HelpTypeIcon type={link.type} className="h-6 w-6 text-magenta" />{link.title}</h1>
      {link.description && <p className="text-[14px] text-ink-2">{link.description}</p>}
      {src ? (
        <>
          <iframe src={src} title={link.title} className="mt-3 h-[75vh] w-full border border-line bg-white" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" data-help-viewer />
          <p className="mt-2 text-[12.5px] text-ink-3">Not showing? <a href={link.url} target="_blank" rel="noreferrer" className="font-semibold text-magenta-dark underline">Open in a new tab</a></p>
        </>
      ) : (
        <div className="mt-4 rounded-[10px] border border-line bg-white p-5" data-help-new-tab>
          <p className="text-[14.5px]">This one can&apos;t be shown inside Panameer — it opens on its own site.</p>
          <a href={link.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">Open in a New Tab</a>
        </div>
      )}
    </div>
  );
}
