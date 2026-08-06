"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useMe } from "@/components/MeProvider";
import { Popover } from "@/components/casing/Popover";
import { COMPANY_NAV } from "@/lib/nav";

/**
 * The company chip, top-left of the rail (E214).
 *
 * ZONE ONE OF THREE: org context top-left, work in the middle of the rail, you
 * at the bottom. The chip was previously a static block — the company's name
 * and logo and nothing else — which meant the org zone announced where you were
 * but gave you no way to act on it.
 *
 * ADMIN-ONLY, AND NOT MERELY HIDDEN-IF-UNAUTHORISED. A non-admin sees the same
 * chip they always saw: name, logo, no chevron, nothing to click. Rendering the
 * menu and letting the routes bounce them would be a worse lie than not showing
 * it — every destination behind this is a company-administration surface, and a
 * member who is not the admin has nothing to do on any of them.
 *
 * The predicate is the server's. `me.company.isAdmin` is set in `getMe` from
 * the same APPROVED + ADMIN membership test `getCompanyBinding` uses for the
 * page gates, so the menu and the pages behind it cannot disagree about who is
 * an admin — and this component never decides for itself.
 */
export function CompanyMenu() {
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const company = me?.company;
  if (!company?.name) return null;

  const mark = company.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={company.logoUrl} alt="" className="h-8 w-8 rounded-[7px] object-cover" />
  ) : (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] bg-white/10 text-[12px] font-bold text-white/70">
      {company.name.slice(0, 2).toUpperCase()}
    </span>
  );

  /*
    A NON-ADMIN GETS A LINK, NOT A MENU (E225).

    It was a static block, which was fine while the personal popover carried
    "My Company". E225 removed that entry — correctly, it was the last item
    crossing the company/personal line — and a static chip would have left an
    ordinary member with no route to their own company page at all.

    So the chip is the route for everyone: a menu of admin surfaces if you
    administer the company, a plain link to the read-only company page if you
    do not. `/company` already renders for any member and adds the join queue
    and terms acceptance only for an admin, so the destination was always safe;
    what was missing was a door.
  */
  if (!company.isAdmin) {
    return (
      <Link
        href="/company"
        className="mt-3 flex items-center gap-2.5 rounded-[10px] px-1 py-1 transition-colors hover:bg-white/10"
      >
        {mark}
        <p className="min-w-0 truncate text-[15px] font-bold text-white">{company.name}</p>
      </Link>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${company.name} menu`}
        className="mt-3 flex w-full items-center gap-2.5 rounded-[10px] px-1 py-1 text-left transition-colors hover:bg-white/10"
      >
        {mark}
        <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">
          {company.name}
        </p>
        <span aria-hidden className="pr-1 text-white/45">
          ›
        </span>
      </button>

      <Popover
        open={open}
        onClose={close}
        anchorRef={triggerRef}
        placement="bottom-start"
        width={264}
        label={`${company.name} menu`}
      >
        <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
          {company.name}
        </p>
        {COMPANY_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            onClick={close}
            className="block w-full px-4 py-2.5 text-left text-[14.5px] text-ink hover:bg-black/[0.04]"
          >
            {item.label}
          </Link>
        ))}
      </Popover>
    </>
  );
}
