import { FREE_AS_OF_LINE } from "@/lib/free-as-of";

export function FreeLine({
  claim,
  compare,
}: {
  claim: string;
  compare?: string;
}) {
  return (
    <p className="mt-1 text-[13.5px] leading-relaxed text-ink">
      <strong className="font-semibold">{claim}</strong>
      {compare ? <span className="text-ink-2"> {compare}</span> : null}{" "}
      {}
      <span className="text-ink-3">{FREE_AS_OF_LINE}</span>
    </p>
  );
}
