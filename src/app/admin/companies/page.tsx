"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminHeading,
  SearchBox,
  useAdminFetch,
  AdminState,
} from "@/components/admin/primitives";

type Company = {
  id: string;
  company: string;
  code: string;
  kind: string;
  status: string;
  joinedAt: string;
  users: {
    total: number;
    buyers: number;
    providers: number;
    coordinators: number;
    support: number;
  };
};

export default function AdminCompaniesPage() {
  const { data, loading, error } = useAdminFetch<{ companies: Company[] }>(
    "/api/admin/companies"
  );
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = data?.companies ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (r) =>
        r.company.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle) ||
        r.kind.toLowerCase().includes(needle)
    );
  }, [data, q]);

  return (
    <div>
      <AdminHeading title="Companies" subtitle="Every account on the platform." />
      <div className="mb-4">
        <SearchBox value={q} onChange={setQ} placeholder="Search company, code, kind…" />
      </div>
      <AdminState loading={loading} error={error} />

      {data && (
        <div className="overflow-x-auto rounded-brand border border-line">
          <table className="w-full min-w-[760px] text-[14px]">
            <thead className="bg-black/[0.02] text-left text-[12px] font-bold uppercase tracking-wide text-ink-2">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Users (B / P / C)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-black/[0.015]">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/companies/${r.id}`} className="hover:text-magenta">
                      {r.company}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{r.code}</td>
                  <td className="px-4 py-3 text-ink-2">{r.kind}</td>
                  <td className="px-4 py-3 text-ink-2">
                    {r.users.total} ({r.users.buyers} / {r.users.providers} /{" "}
                    {r.users.coordinators})
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {new Date(r.joinedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-2">
                    No companies match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
