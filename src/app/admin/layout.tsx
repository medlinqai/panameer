import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { guardPage } from "@/lib/guard";
import { TaskPanel } from "@/components/console/TaskPanel";

/**
 * The Platform Console now wears THE SAME CASING as the rest of the app
 * (WS1/WS4). It used to have its own two-pane chrome with a light rail and a
 * hand-rolled nav — which is why the admin's console looked like a different
 * product from the one they administer, and why the E009 mockup reads as a
 * correction rather than an addition.
 *
 * The server gate is unchanged and still authoritative: canAdminister here, the
 * edge proxy as the fast first line. Fail closed.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("canAdminister");
  return (
    <MeProvider>
      <AppShell>
        {/*
          The task panel is fixed to the right edge, so it sits OUTSIDE the
          content flow — and the content reserves the strip's width at lg so a
          wide table never runs underneath it.
        */}
        <div className="lg:pr-[68px]">
          {/*
            ── ⚠⚠⚠ ONE CONTENT FRAME FOR EVERY ADMIN PAGE (`P2-ALL-E768`) ────────

            ⚠ **SCOTT, 2026-10-02, walking `/admin/work-tracker`:** *"The page
            margins were a bit to the edge."*

            ⚠⚠⚠ **AND THE PREMISE CHECK FOUND THERE WAS NOTHING TO MATCH IT TO.**
            Measured at 1440 on four admin pages before this landed:
            `/admin/work-tracker`, `/admin/support`, `/admin/learn` and
            `/admin/skill-catalog` ALL reported `main` padding `32px`, first-child
            `max-width: none` and a content width of **1376px**. ⚠ The brief asked
            for *"the same page frame as the other admin pages"* — and the tracker
            already WAS the same. **The complaint was true of every admin page**, so
            matching its siblings would have changed nothing and shipped as a fix.
            ⚠ Scott's ruling: **(b), one frame here for all of them.**

            ⚠⚠ **IT CAPS, IT DOES NOT IMPOSE.** A page that already sets a NARROWER
            width keeps it — `/admin/skill-catalog` measured 1024px (`max-w-5xl`)
            and still does. `max-w-[1200px]` is a ceiling on the pages that had
            none, not a new width for the ones that chose one.

            ⚠ **THE GUTTERS ARE NOT TOUCHED.** `AppShell`'s `main` keeps
            `px-5 sm:px-8`, so phone width is unchanged (350px of content at 390)
            and nothing moves below `sm`. ⚠⚠ This wrapper adds no padding of its
            own — a second gutter here would have doubled the first.

            ⚠ **IT SITS INSIDE `lg:pr-[68px]`, NOT OUTSIDE IT**, so the centring is
            against the space the content actually has rather than against the
            viewport — otherwise the fixed task strip would push every admin page
            visibly off-centre at `lg`.
          */}
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </div>
        <TaskPanel />
      </AppShell>
    </MeProvider>
  );
}
