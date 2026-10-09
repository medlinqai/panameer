import { DOMParser } from "@xmldom/xmldom";
import { randomBytes } from "node:crypto";

// X-E002..X-E005: small cXML helpers — read with xmldom, write as strings (escaped).
type El = Element;

export function parseCxml(xml: string): Document {
  const errors: string[] = [];
  const doc = new DOMParser({ errorHandler: { error: (m: string) => errors.push(m), fatalError: (m: string) => errors.push(m) } }).parseFromString(xml, "text/xml");
  if (errors.length || !doc?.documentElement || doc.documentElement.nodeName !== "cXML") throw new Error("Not a cXML document");
  return doc;
}

export const all = (root: Document | El, tag: string): El[] => Array.from(root.getElementsByTagName(tag)) as El[];
export const first = (root: Document | El | null | undefined, tag: string): El | null => (root ? (root.getElementsByTagName(tag)[0] as El | undefined) ?? null : null);
export const text = (el: El | null | undefined): string => (el?.textContent ?? "").trim();
export const attr = (el: El | null | undefined, name: string): string => (el?.getAttribute(name) ?? "").trim();
/** `<Extrinsic name="UserId">…</Extrinsic>` under `root`. */
export const extrinsic = (root: Document | El | null, name: string): string => text(all(root as El, "Extrinsic").find((e) => attr(e, "name").toLowerCase() === name.toLowerCase()));

/** The From / Sender credentials and SharedSecret from a cXML Header. */
export function headerCredentials(doc: Document) {
  const header = first(doc, "Header");
  const cred = (part: string) => {
    const c = first(first(header, part), "Credential");
    return { domain: attr(c, "domain"), identity: text(first(c, "Identity")), secret: text(first(c, "SharedSecret")) };
  };
  return { from: cred("From"), to: cred("To"), sender: cred("Sender") };
}

export const esc = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export const payloadId = () => `${Date.now()}.${process.pid}.${randomBytes(6).toString("hex")}@panameer.com`;
export const timestamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");

const DOCTYPE = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.063/cXML.dtd">';

/** A bare `<Response><Status/></Response>` reply. */
export function statusResponse(code: number, text: string, inner = "") {
  return `${DOCTYPE}\n<cXML payloadID="${esc(payloadId())}" timestamp="${timestamp()}" xml:lang="en-US">\n  <Response>\n    <Status code="${code}" text="${esc(text)}"/>${inner ? `\n    ${inner}` : ""}\n  </Response>\n</cXML>\n`;
}

export function cxmlDoc(header: { fromDomain: string; fromIdentity: string; toDomain: string; toIdentity: string }, body: string, opts?: { payloadId?: string; timestamp?: string }) {
  return `${DOCTYPE}\n<cXML payloadID="${esc(opts?.payloadId ?? payloadId())}" timestamp="${esc(opts?.timestamp ?? timestamp())}" xml:lang="en-US">\n  <Header>\n    <From><Credential domain="${esc(header.fromDomain)}"><Identity>${esc(header.fromIdentity)}</Identity></Credential></From>\n    <To><Credential domain="${esc(header.toDomain)}"><Identity>${esc(header.toIdentity)}</Identity></Credential></To>\n    <Sender><Credential domain="${esc(header.fromDomain)}"><Identity>${esc(header.fromIdentity)}</Identity></Credential><UserAgent>Panameer</UserAgent></Sender>\n  </Header>\n${body}\n</cXML>\n`;
}

/** Panameer UOM → cXML (UN/ECE) unit code. */
export function cxmlUom(uom: string | null | undefined): string {
  const u = (uom ?? "").toUpperCase();
  if (u.startsWith("HOUR") || u === "HUR") return "HUR";
  if (u.startsWith("DAY")) return "DAY";
  if (u.startsWith("WEEK") || u === "WEE") return "WEE";
  if (u.startsWith("MONTH") || u === "MON") return "MON";
  return "EA";
}
