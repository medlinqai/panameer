import { TileRow, Listing, VolumeFooter, StubEmpty, type Tile } from "@/components/console/ConsolePage";

/**
 * A console page whose data layer doesn't exist yet (WS5/WS6).
 *
 * Same T1–T5 → M1 → footer shape as a real one, so wiring it later is a data
 * change rather than a rebuild — which is the whole point of the shared
 * template. Every tile is value-less, so they render "—" and say what they are
 * waiting for.
 */
export function StubConsolePage({
  tiles,
  listingTitle,
  columns,
  what,
  why,
  volume,
}: {
  tiles: Tile[];
  listingTitle: string;
  columns: string[];
  what: string;
  why: string;
  volume: Tile[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow tiles={tiles} />
      <Listing
        title={listingTitle}
        columns={columns}
        empty={<StubEmpty what={what} why={why} />}
      />
      <VolumeFooter tiles={volume} />
    </div>
  );
}
