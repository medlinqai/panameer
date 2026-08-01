/** A skill tag chip. */
export function SkillChip({ label }: { label: string }) {
  return (
    <span // max-w-full + break-words: a long skill name ("Supplier Registration &
    // Qualification") is wider than a 375px viewport, and as an unbreakable
    // inline-flex it pushed the whole profile into a horizontal scroll. Surfaced
    // by the casing, which gives the page less room than the old rail did.
    className="inline-flex max-w-full items-center break-words rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-sm text-black/75 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/75">
      {label}
    </span>
  );
}
