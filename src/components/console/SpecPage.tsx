import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { ADMIN_PAGES } from "@/lib/admin-pages";
import { linkVolume } from "@/lib/admin-reports";

/**
 * Renders one admin page from its spec (WS2). Fourteen slides, one renderer.
 */
export function SpecPage({ slug }: { slug: keyof typeof ADMIN_PAGES }) {
  const s = ADMIN_PAGES[slug];
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow tiles={s.tiles} />
      <Listing
        title={s.listingTitle}
        columns={s.columns}
        empty={
          <StubEmpty
            what={s.what}
            why={
              s.why ??
              "Nothing to show yet — this listing's data layer isn't built."
            }
          />
        }
      />
      {s.volume && <VolumeFooter tiles={linkVolume(s.volume)} title={s.volumeTitle} />}
    </div>
  );
}
