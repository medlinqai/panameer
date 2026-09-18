import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { tabsWithUnread, unreadCount } from "@/lib/messages";
import { ConnectHome } from "@/components/community/ConnectHome";

/**
 * ── ⚠⚠ `/community` IS CONNECT HOME (`P2-J3-E557` WS-B) ────────────────────
 *
 * ⚠ IT WAS THE COLLEAGUES LANDING. That body MOVED to
 * `/community/colleagues` — it was not rewritten and nothing a member could do
 * yesterday is missing today.
 *
 * ⚠⚠ HOME IS "WHAT NEEDS YOU", NOT A SUMMARY OF THE SECTION. The blocks are
 * Waiting on you · Your colleagues · People you may know · Teams, and every
 * list is CAPPED and hands off to the tab that owns it.
 * ⚠⚠⚠ NO FEED, NO FORUMS BLOCK, NO UNREAD-MESSAGES BLOCK — see `ConnectHome`.
 * A block that duplicates a destination in the menu above it is the pattern
 * being removed.
 */
export default async function ConnectHomePage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  /* ⚠ `P1-ALL-E379` — the Messages tab carries the unread count on every page
     in this row, so the number is the same wherever you are standing. */
  const unread = viewer ? await unreadCount(viewer) : 0;

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/community")}
        tabs={tabsWithUnread(PAGE_TABS["/community"], unread)}
        current="/community"
      />
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            My Community
          </h1>
        </header>
        {viewer && <ConnectHome viewer={viewer} />}
      </div>
    </>
  );
}
