// My Learning hero picture: certificate tiles — solid ink = earned, dashed = still to earn, magenta edge on the next one.
type Tile = { title: string; state: "earned" | "next" | "todo" };
export function CertificateTiles({ tiles }: { tiles: Tile[] }) {
  const shown = tiles.slice(0, 6);
  return (
    <div data-certificate-tiles>
      <div className="mx-auto grid max-w-[320px] grid-cols-2 gap-3">
        {shown.length === 0 && <div className="col-span-2 grid h-[120px] place-items-center border-2 border-dashed border-[#C9CDDC] text-[13px] text-ink-3">Your first certificate goes here</div>}
        {shown.map((t, i) => (
          <div key={i} className={"flex h-[92px] flex-col justify-between p-2.5 " + (t.state === "earned" ? "bg-ink text-surface" : t.state === "next" ? "border-2 border-dashed border-[#C9CDDC] border-l-[5px] border-l-magenta" : "border-2 border-dashed border-[#C9CDDC] text-ink-3")}>
            <span className="text-[10px] font-bold tracking-[0.1em]">{t.state === "earned" ? "CERTIFIED ✓" : t.state === "next" ? <span className="text-magenta">NEXT</span> : "TO EARN"}</span>
            <span className="line-clamp-2 text-[12.5px] font-bold leading-snug">{t.title}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-2">Solid = earned · dashed = still to earn</p>
    </div>
  );
}
