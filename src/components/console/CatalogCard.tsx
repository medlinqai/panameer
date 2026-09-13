import type { ReactNode } from "react";
import { CARD, CARD_HEADER, CARD_TITLE } from "@/components/console/listing-shared";

/**
 * THE CATALOG'S LISTING CONTAINER (`P1-A1.5-E470`).
 *
 * **SCOTT:** *"The grid is at the bottom of the page. All of the specializations
 * should occur within this grid...then be expandable."* — and, unprompted,
 * *"i forgot to mention this on the RDS page as well, but it applies."*
 *
 * ⚠ WHY A THIN WRAPPER RATHER THAN PASSING THE TREE TO `Listing`: `Listing`
 * renders a `<table>` from `rows: ReactNode[][]`, and a catalog is a TREE — five
 * parents owning a long tail of children, expandable. Forcing it through the
 * table would flatten exactly the hierarchy the brief says to keep.
 *
 * ⚠⚠ SO IT BORROWS THE CARD, NOT THE TABLE. The card, its header band and its
 * title come from `listing-shared.ts` — the same constants `Listing` and
 * `InteractiveListing` use — so the catalog reads as the console's one listing
 * slot and cannot drift from the other console pages' chrome.
 *
 * ⚠ NO SEARCH BOX HERE. `CatalogTree`'s own toolbar owns the search on RDS
 * (`E464`), and there must be EXACTLY ONE search box per page.
 */
export function CatalogCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={CARD}>
      <header className={CARD_HEADER}>
        <h2 className={CARD_TITLE}>{title}</h2>
        {action && <span className="ml-auto flex items-center gap-3">{action}</span>}
      </header>
      <div className="border-t border-line p-4">{children}</div>
    </section>
  );
}
