import type { ErpConnection } from "@prisma/client";

// X-E006: one settlement adapter per ERP. Oracle Cloud is the only implementation; nothing runs while ERP_SEND_ENABLED is off.
export type ReceiptInput = {
  poNumber: string;
  requestNumber: string;
  periodStart: string;
  periodEnd: string;
  submittedAt: string;
  lines: { poLineNumber: string | null; description: string; quantity: number | null; uom: string | null; amountCents: number }[];
};

export type ErpReceiptStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNKNOWN";

export interface SettlementAdapter {
  /** The body queued in the ErpMessage log (what will be sent). */
  buildReceipt(input: ReceiptInput): string;
  /** Create + submit; returns the ERP's id for status polls. */
  sendReceipt(conn: ErpConnection, body: string): Promise<{ response: string; externalId: string | null }>;
  pollStatus(conn: ErpConnection, externalId: string): Promise<{ status: ErpReceiptStatus; note: string | null }>;
}

const WC = "/fscmRestApi/resources/11.13.18.05/workConfirmations";

/** Credentials come only from the env var the connection names ("user:password"). */
function auth(conn: ErpConnection): string {
  const v = conn.credential_env_name ? process.env[conn.credential_env_name] : undefined;
  if (!v) throw new Error(`Credential env var ${conn.credential_env_name ?? "(none)"} is not set`);
  return `Basic ${Buffer.from(v).toString("base64")}`;
}

function base(conn: ErpConnection): string {
  if (!conn.oracle_rest_base_url) throw new Error("No Oracle REST base URL on this connection");
  return conn.oracle_rest_base_url.replace(/\/$/, "");
}

/** Oracle Cloud Procurement — Work Confirmations REST (complex-work POs). Field names to be confirmed in Scott's test pod. */
export const oracleCloudAdapter: SettlementAdapter = {
  buildReceipt(i) {
    return JSON.stringify(
      {
        OrderNumber: i.poNumber,
        WorkConfirmationNumber: i.requestNumber,
        PeriodOfPerformanceStartDate: i.periodStart,
        PeriodOfPerformanceEndDate: i.periodEnd,
        Comments: `Panameer payment request ${i.requestNumber} (submitted ${i.submittedAt.slice(0, 10)})`,
        lines: i.lines.map((l) => ({
          LineNumber: l.poLineNumber,
          Description: l.description,
          ...(l.quantity != null ? { Quantity: l.quantity, UOMCode: l.uom } : {}),
          Amount: (l.amountCents / 100).toFixed(2),
        })),
      },
      null,
      2
    );
  },
  async sendReceipt(conn, body) {
    const h = { Authorization: auth(conn), "Content-Type": "application/json" };
    const created = await fetch(`${base(conn)}${WC}`, { method: "POST", headers: h, body });
    const text = await created.text();
    if (!created.ok) throw new Error(`Create ${created.status}: ${text.slice(0, 1000)}`);
    const id = String((JSON.parse(text) as { WorkConfirmationId?: string | number }).WorkConfirmationId ?? "");
    if (!id) throw new Error("Oracle did not return a WorkConfirmationId");
    const submit = await fetch(`${base(conn)}${WC}/${id}/action/submit`, { method: "POST", headers: { ...h, "Content-Type": "application/vnd.oracle.adf.action+json" }, body: "{}" });
    const st = await submit.text();
    if (!submit.ok) throw new Error(`Submit ${submit.status}: ${st.slice(0, 1000)}`);
    return { response: `Created ${id}; submitted for the requester's approval`, externalId: id };
  },
  async pollStatus(conn, externalId) {
    const r = await fetch(`${base(conn)}${WC}/${externalId}`, { headers: { Authorization: auth(conn) } });
    if (!r.ok) return { status: "UNKNOWN", note: `${r.status}` };
    const j = (await r.json()) as { Status?: string; StatusCode?: string; RejectionReason?: string };
    const s = (j.StatusCode ?? j.Status ?? "").toUpperCase();
    if (s.includes("APPROVED") || s.includes("ACCEPTED")) return { status: "APPROVED", note: null };
    if (s.includes("REJECT")) return { status: "REJECTED", note: j.RejectionReason ?? "Rejected in the ERP" };
    return { status: "PENDING", note: null };
  },
};

export function adapterFor(conn: Pick<ErpConnection, "erp_kind">): SettlementAdapter {
  switch (conn.erp_kind) {
    case "ORACLE_CLOUD":
      return oracleCloudAdapter;
  }
}
