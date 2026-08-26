import { redirect } from "next/navigation";

/**
 * /work/new — retired in favour of /create-work
 * (brief_create_work_request_v1 WS-D).
 *
 * The four-screen wizard that lived here asked for a category and a flat skill
 * list; the deck's flow is the Role → Domain → Skill cascade, and running two
 * create flows against one `WorkRequest` model is how they drift.
 *
 * A REDIRECT RATHER THAN A DELETE. Five places still point here — the buyer
 * dashboard, the requester "ready" page, the buyer signup's completion push —
 * and rewriting all of them to remove a URL that people may also have
 * bookmarked buys nothing. One redirect keeps every one of them working.
 */
export default function Page() {
  redirect("/create-work");
}
