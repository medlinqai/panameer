/**
 * The ONE mapper from a prisma Project row to the shape every surface renders
 * (brief_project_model_v2 / _validation).
 *
 * Its own module on purpose: both `employers.ts` (the provider API) and
 * `onboarding.ts` (the wizard's status payload) need it, and those two already
 * import from each other. Putting the mapper in either one closes an import
 * cycle; putting it here keeps the graph acyclic.
 *
 * Every project surface goes through this. Hand-rolled projections are how the
 * wizard modal ended up opening v2 projects with blank client, role, tools and
 * contact email — and then saving those blanks back.
 */
export function projectToCard(p: {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  start_date: Date | null;
  end_date: Date | null;
  is_current: boolean;
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
  validations?: {
    status: string;
    sent_at: Date;
    responded_at: Date | null;
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
    validatedAt:
      p.validations?.find((v) => v.status === "CONFIRMED")?.responded_at?.toISOString() ??
      null,
    /** A live request — drives "Requested — awaiting reply" + Resend. */
    validationRequestedAt:
      p.validations?.find((v) => v.status === "SENT")?.sent_at?.toISOString() ?? null,
  };
}

