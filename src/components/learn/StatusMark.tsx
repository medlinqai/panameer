// Learn status language: ink ✓ = done · magenta dot = where you are · grey ring = not started.
export function StatusMark({ state, size = 18 }: { state: "done" | "now" | "todo"; size?: number }) {
  if (state === "done")
    return <span aria-label="Done" className="grid shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-surface" style={{ width: size, height: size }}>✓</span>;
  if (state === "now")
    return <span aria-label="You are here" className="grid shrink-0 place-items-center rounded-full border-2 border-magenta" style={{ width: size, height: size }}><span className="block rounded-full bg-magenta" style={{ width: size / 2.6, height: size / 2.6 }} /></span>;
  return <span aria-label="Not started" className="block shrink-0 rounded-full border-2 border-[#C9CDDC]" style={{ width: size, height: size }} />;
}
