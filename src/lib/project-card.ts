import { toView as toArtifactView } from "@/lib/artifacts";

export function projectToCard(p: {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_current: boolean;
  role_title: string | null;
  location: string | null;
  client_name: string;
  client_domain: string | null;
  client_visibility: string;
  code_name: string | null;
  contact_email: string | null;
  validation_status: string;
  highlights: string[];
  video_url: string | null;
  document_path: string | null;
  document_name: string | null;
  logo_url: string | null;
  roleType: { id: string; name: string } | null;
  industry: { id: string; name: string } | null;
  applications: { application: { id: string; name: string } }[];
  outcomes: { id: string; label: string; value: string }[];
  artifacts?: {
    id: string; kind: string; label: string; url: string | null;
    file_path: string | null; employer_id: string | null; project_id: string | null;
  }[];
  validations?: {
    status: string;
    sent_at: Date;
    responded_at: Date | null;
    answered_at?: Date | null;
    worked_from?: Date | null;
    worked_to?: Date | null;
    role_note?: string | null;
    skills_noted?: string[];
    would_work_again?: string | null;
    testimonial?: string | null;
    responder_name?: string | null;
    responder_title?: string | null;
    testimonial_public?: boolean;
    attribution_public?: boolean;
  }[];
}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    url: p.url,
    imageUrl: p.image_url,
    startDate: p.start_date ? p.start_date.toISOString().slice(0, 10) : null,
    endDate: p.end_date ? p.end_date.toISOString().slice(0, 10) : null,
    isCurrent: p.is_current,
    roleTitle: p.role_title,
    location: p.location,
    clientName: p.client_name,
    // PROVIDER-FACING ONLY. `provider-profile-view.ts` (the public read) does
    // NOT select this — a confidential project must not leak its client through
    // the domain (brief §4).
    clientDomain: p.client_domain,
    clientVisibility: p.client_visibility,
    codeName: p.code_name,
    contactEmail: p.contact_email,
    validationStatus: p.validation_status,
    highlights: p.highlights,
    videoUrl: p.video_url,
    documentPath: p.document_path,
    documentName: p.document_name,
    logoUrl: p.logo_url,
    roleType: p.roleType,
    industry: p.industry,
    applications: p.applications.map((a) => a.application),
    outcomes: p.outcomes.map((o) => ({ id: o.id, label: o.label, value: o.value })),
    // WS4 (E078a) — proof attached to this project.
    artifacts: (p.artifacts ?? []).map(toArtifactView),
    validatedAt:
      p.validations?.find((v) => v.status === "CONFIRMED")?.responded_at?.toISOString() ??
      null,
    /** A live request — drives "Requested — awaiting reply" + Resend. */
    validationRequestedAt:
      p.validations?.find((v) => v.status === "SENT")?.sent_at?.toISOString() ?? null,
    clientAnswers: (() => {
      const v = p.validations?.find((x) => x.answered_at);
      if (!v) return null;
      const answered = [
        v.worked_from || v.worked_to,
        v.role_note,
        v.skills_noted && v.skills_noted.length > 0,
        v.would_work_again,
        v.testimonial,
      ].filter(Boolean).length;
      return {
        answeredCount: answered,
        totalQuestions: 5,
        workedFrom: v.worked_from?.toISOString() ?? null,
        workedTo: v.worked_to?.toISOString() ?? null,
        roleNote: v.role_note ?? null,
        skillsNoted: v.skills_noted ?? [],
        wouldWorkAgain: v.would_work_again ?? null,
        testimonial: v.testimonial ?? null,
        responderName: v.responder_name ?? null,
        responderTitle: v.responder_title ?? null,
        testimonialPublic: v.testimonial_public === true,
        attributionPublic: v.attribution_public === true,
      };
    })(),
  };
}

