import { AdminHeading } from "@/components/admin/primitives";

/** Support center — coming-soon stub (v1). The full tool is a later brief. */
export default function AdminSupportPage() {
  return (
    <div>
      <AdminHeading title="Support" />
      <div className="rounded-brand border border-line p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-bold">Support center</h2>
          <span className="rounded-full bg-line px-2.5 py-0.5 text-[12px] font-bold text-ink-2">
            Coming soon
          </span>
        </div>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
          Ticketing, the bug-reporting tool, and buyer/provider support workflows
          will live here. Building it out is a later brief.
        </p>
      </div>
    </div>
  );
}
