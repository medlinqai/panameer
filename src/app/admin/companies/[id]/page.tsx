"use client";

import { use } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { AdminHeading, useAdminFetch, AdminState } from "@/components/admin/primitives";

type Person = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  emailVerified: boolean;
  roles: { buyer: boolean; provider: boolean; coordinator: boolean; support: boolean };
  provider: {
    status: string;
    completeness: number;
    validationStatus: string;
    paused: boolean;
  } | null;
  buyer: { subscriptionTier: string } | null;
};

type Company = {
  id: string;
  company: string;
  code: string;
  kind: string;
  status: string;
  joinedAt: string;
  users: { total: number };
  people: Person[];
};

function roleChips(p: Person) {
  const r: string[] = [];
  if (p.roles.buyer) r.push("Buyer");
  if (p.roles.provider) r.push("Provider");
  if (p.roles.coordinator) r.push("Coordinator");
  if (p.roles.support) r.push("Support");
  return r;
}

export default function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading, error } = useAdminFetch<Company>(`/api/admin/companies/${id}`);

  return (
    <div>
      <Link
        href="/admin/companies"
        className="mb-4 inline-block text-[14px] font-bold text-ink-2 hover:text-magenta"
      >
        ← All Companies
      </Link>
      <AdminState loading={loading} error={error} />

      {data && (
        <>
          <AdminHeading
            title={data.company}
            subtitle={`${data.kind} · code ${data.code} · joined ${new Date(data.joinedAt).toLocaleDateString()} · ${data.users.total} people`}
          />

          <div className="overflow-x-auto rounded-brand border border-line">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead className="bg-black/[0.02] text-left text-[12px] font-bold uppercase tracking-wide text-ink-2">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Profile State</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.id} className="border-t border-line align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {p.title && <p className="text-[13px] text-ink-2">{p.title}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {p.email ?? "—"}
                      {p.email && !p.emailVerified && (
                        <span className="ml-1 text-amber-600">(unverified)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roleChips(p).map((c) => (
                          <Badge key={c}>{c}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.provider ? (
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={p.provider.status === "ACTIVE" ? "green" : "amber"}>
                            {p.provider.status}
                          </Badge>
                          <Badge>{p.provider.completeness}%</Badge>
                          {p.provider.validationStatus === "VALIDATED" && (
                            <Badge tone="green">✓ Validated</Badge>
                          )}
                          {p.provider.validationStatus === "REQUESTED" && (
                            <Badge tone="amber">Requested</Badge>
                          )}
                          {p.provider.validationStatus === "REJECTED" && (
                            <Badge tone="red">Rejected</Badge>
                          )}
                          {p.provider.paused && <Badge tone="amber">Paused</Badge>}
                        </div>
                      ) : p.buyer ? (
                        <Badge tone="blue">
                          {p.buyer.subscriptionTier === "BUSINESS_PLUS"
                            ? "Business Plus"
                            : "Basic"}
                        </Badge>
                      ) : (
                        <span className="text-ink-2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
