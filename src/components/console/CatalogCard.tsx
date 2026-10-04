import type { ReactNode } from "react";
import { CARD, CARD_HEADER, CARD_TITLE } from "@/components/console/listing-shared";

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
