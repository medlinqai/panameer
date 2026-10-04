import type { ReactNode } from "react";

export function HeroBox({
  children,
  /** The card's own surface — each hero keeps its own gradient. */
  cardClassName = "",
}: {
  children: ReactNode;
  cardClassName?: string;
}) {
  return (
    <div className="px-2.5 pt-1.5 min-[901px]:px-11">
      <div
        className={
          "relative overflow-hidden rounded-[20px] min-[901px]:rounded-[26px] " +
          cardClassName
        }
      >
        {children}
      </div>
    </div>
  );
}
