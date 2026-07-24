"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import {
  StatTile,
  AdminHeading,
  SearchBox,
  useAdminFetch,
  AdminState,
} from "@/components/admin/primitives";

type Provider = {
  id: string;
  name: string;
  company: string;
  status: string;
  completeness: number;
  validationStatus: string;
  paused: boolean;
  requestedAt: string | null;
};

type Data = {
  stages: { invited: number; registered: number; eightyComplete: number; validated: number };
  providers: Provider[];
};

export default function AdminProvidersPage() {
  const { data, loading, error, reload } = useAdminFetch<Data>("/api/admin/providers");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = data?.providers ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.company.toLowerCase().includes(needle)
    );
  }, [data, q]);

  const act = async (id: string, action: "validate" | "reject") => {
    setBusyId(id);
    setActionError(null);
    try {
      const r = await fetch(`/api/admin/providers/${id}/${action}`, { method: "POST" });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        setActionError(b.error ?? "Action failed.");
        return;
      }
      await reload(); // refresh tiles + row
    } finally {
      setBusyId(null);
    }
  };

  const valTone = (v: string) =>
    v === "VALIDATED" ? "green" : v === "REJECTED" ? "red" : v === "REQUESTED" ? "amber" : "neutral";

  return (
    <div>
      <AdminHeading
        title="Providers"
        subtitle="The provider pipeline and validation workbench."
      />
      <AdminState loading={loading} error={error} />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Invited" value={data.stages.invited} hint="open invite, no account" />
            <StatTile label="Registered" value={data.stages.registered} hint="< 80% complete" />
            <StatTile
              label="80% Complete"
              value={data.stages.eightyComplete}
              tone="magenta"
              hint="live, not validated"
            />
            <StatTile label="Validated" value={data.stages.validated} tone="green" />
          </div>

          {actionError && (
            <p className="mt-4 rounded-[12px] border border-red-500/30 bg-red-500/5 px-4 py-2 text-[14px] text-red-700">
              {actionError}
            </p>
          )}

          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold">Providers</h2>
              <SearchBox value={q} onChange={setQ} placeholder="Search provider or company…" />
            </div>
            <div className="overflow-x-auto rounded-brand border border-line">
              <table className="w-full min-w-[820px] text-[14px]">
                <thead className="bg-black/[0.02] text-left text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Complete</th>
                    <th className="px-4 py-3">Validation</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-[13px] text-ink-2">{p.company}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={p.status === "ACTIVE" ? "green" : "amber"}>
                            {p.status}
                          </Badge>
                          {p.paused && <Badge tone="amber">Paused</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{p.completeness}%</td>
                      <td className="px-4 py-3">
                        <Badge tone={valTone(p.validationStatus)}>
                          {p.validationStatus.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => act(p.id, "validate")}
                            disabled={busyId === p.id || p.validationStatus === "VALIDATED"}
                            className="rounded-full bg-magenta px-4 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
                          >
                            Validate
                          </button>
                          <button
                            onClick={() => act(p.id, "reject")}
                            disabled={busyId === p.id || p.validationStatus === "REJECTED"}
                            className="rounded-full border border-red-500/30 px-4 py-1.5 text-[13px] font-bold text-red-600 transition-colors hover:bg-red-500/5 disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-ink-2">
                        No providers match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
