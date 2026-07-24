"use client";

import { useMemo, useState } from "react";
import {
  StatTile,
  AdminHeading,
  SearchBox,
  useAdminFetch,
  AdminState,
} from "@/components/admin/primitives";

type Dashboard = {
  stats: {
    companies: number;
    providers: number;
    buyers: number;
    coordinators: number;
    workRequests: number;
    skills: number;
  };
  usage: {
    id: string;
    name: string;
    kind: string;
    userCount: number;
    providerSummary: string;
    joinedAt: string;
  }[];
};

export default function AdminDashboardPage() {
  const { data, loading, error } = useAdminFetch<Dashboard>("/api/admin/dashboard");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.usage;
    return data.usage.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.kind.toLowerCase().includes(needle)
    );
  }, [data, q]);

  return (
    <div>
      <AdminHeading title="Dashboard" subtitle="Platform usage & adoption at a glance." />
      <AdminState loading={loading} error={error} />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatTile label="Companies" value={data.stats.companies} />
            <StatTile label="Providers" value={data.stats.providers} tone="magenta" />
            <StatTile label="Buyers" value={data.stats.buyers} />
            <StatTile label="Coordinators" value={data.stats.coordinators} />
            <StatTile label="Work Requests" value={data.stats.workRequests} />
            <StatTile label="Skills" value={data.stats.skills} hint="catalog" />
          </div>

          <div className="mt-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold">Usage &amp; Adoption</h2>
              <SearchBox value={q} onChange={setQ} placeholder="Search companies…" />
            </div>
            <div className="overflow-x-auto rounded-brand border border-line">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead className="bg-black/[0.02] text-left text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3">Providers</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-ink-2">{r.kind}</td>
                      <td className="px-4 py-3 text-ink-2">{r.userCount}</td>
                      <td className="px-4 py-3 text-ink-2">{r.providerSummary}</td>
                      <td className="px-4 py-3 text-ink-2">
                        {new Date(r.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-ink-2">
                        No companies match your search.
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
