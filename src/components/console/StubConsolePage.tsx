import { TileRow, Listing, VolumeFooter, StubEmpty, type Tile } from "@/components/console/ConsolePage";

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
