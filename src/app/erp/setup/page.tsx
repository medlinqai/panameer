import { redirect } from "next/navigation";

// ES-E003: /erp/setup is the brief's name; the page lives under /punchout so the punch-out cookie reaches it.
export default function Page() { redirect("/punchout/setup"); }
