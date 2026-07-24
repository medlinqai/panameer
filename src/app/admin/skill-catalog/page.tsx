"use client";

import { AdminHeading, useAdminFetch, AdminState } from "@/components/admin/primitives";
import { Badge } from "@/components/Badge";

type Tree = {
  catalog: { code: string; name: string };
  pillars: {
    id: string;
    code: string;
    name: string;
    offerings: { id: string; name: string; applications: { id: string; name: string }[] }[];
  }[];
  roleTypes: { id: string; display: string }[];
};

export default function AdminSkillCatalogPage() {
  // Reuses the public catalog read (brief_B); read-only in v1 — no editing.
  const { data, loading, error } = useAdminFetch<Tree>("/api/catalog/erp");

  return (
    <div>
      <AdminHeading
        title="Skill Catalog"
        subtitle="The ERP service taxonomy (read-only in v1 — editing is a later brief)."
      />
      <AdminState loading={loading} error={error} />

      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold">Role Types:</span>
            {data.roleTypes.map((rt) => (
              <Badge key={rt.id}>{rt.display}</Badge>
            ))}
          </div>

          {data.pillars.map((pillar) => (
            <div key={pillar.id} className="rounded-brand border border-line p-5">
              <h3 className="text-[16px] font-bold">
                {pillar.name}{" "}
                <span className="font-mono text-[13px] font-normal text-ink-2">
                  ({pillar.code})
                </span>
              </h3>
              {pillar.offerings.length === 0 ? (
                <p className="mt-2 text-[14px] text-ink-2">No offerings.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {pillar.offerings.map((o) => (
                    <div key={o.id}>
                      <p className="text-[14px] font-semibold">{o.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {o.applications.map((a) => (
                          <span
                            key={a.id}
                            className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-ink-2"
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
