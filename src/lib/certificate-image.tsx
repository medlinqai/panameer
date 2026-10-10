import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { CertificateView } from "@/lib/certificates";
import { issuedLabel } from "@/lib/certificate-links";

// L-E056/L-E059: the certificate card as a 1200×630 PNG — downloads, the PDF, and the Open Graph preview.
let mark: string | null = null;
async function logo() {
  if (!mark) mark = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/brand/panameer-lockup-white.png"))).toString("base64")}`;
  return mark;
}

export async function certificatePng(c: CertificateView): Promise<ImageResponse> {
  const src = await logo();
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", padding: 72, color: "white", backgroundImage: "linear-gradient(45deg, #140A2E 0%, #3D1A5B 40%, #7A1F86 75%, #C81E8C 100%)", position: "relative" }}>
        <div style={{ position: "absolute", right: -40, top: -90, fontSize: 520, fontWeight: 800, opacity: 0.08, display: "flex" }}>P</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" height={56} style={{ height: 56 }} />
        <div style={{ marginTop: 54, fontSize: 24, letterSpacing: 8, fontWeight: 800, color: "#F3B6F0", display: "flex" }}>CERTIFIED</div>
        <div style={{ marginTop: 14, fontSize: c.title.length > 32 ? 58 : 70, fontWeight: 800, lineHeight: 1.05, display: "flex" }}>{c.title}</div>
        <div style={{ marginTop: 26, fontSize: 34, opacity: 0.9, display: "flex" }}>{c.holder}</div>
        <div style={{ marginTop: "auto", display: "flex", gap: 40, fontSize: 22, opacity: 0.8 }}>
          <span>Issued {issuedLabel(c.issuedOn)}</span>
          <span>Credential {c.credentialId}</span>
          {c.score != null ? <span>{`${c.score}%${c.correct != null && c.total ? ` · ${c.correct} of ${c.total}` : ""}`}</span> : null}
        </div>
        <div style={{ position: "absolute", right: 72, top: 84, fontSize: 22, fontWeight: 700, letterSpacing: 2, color: "#F3B6F0", display: "flex" }}>VERIFIED BY PANAMEER</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
