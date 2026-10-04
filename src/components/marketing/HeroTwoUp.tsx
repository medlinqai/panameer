import type { ReactNode } from "react";

export type HeroTwoUpProps = {
  /** The headline column. Conventionally `<h1>` + the CTA(s). */
  left: ReactNode;
  /** The supporting column. Conventionally sub-copy + a bridge line + stats. */
  right: ReactNode;
  rowClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
};

const DEFAULT_ROW =
  "grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2";

export function HeroTwoUp({
  left,
  right,
  rowClassName = DEFAULT_ROW,
  leftClassName,
  rightClassName,
}: HeroTwoUpProps) {
  return (
    <div className={rowClassName}>
      {}
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  );
}
