import { prisma } from "@/lib/prisma";
/* ⚠ `P1-ALL-E282` — the register lookup, called SERVER-SIDE from defineCompany.
   The client never posts a match; that would be a forgeable trust claim. */
import { validateEntity } from "@/lib/company-validation";
import type { Viewer } from "@/lib/access";
import { recomputeCompleteness } from "@/lib/onboarding";
import { OnboardingError } from "@/lib/onboarding";
import {
  COMPANY_TOS_VERSION,
  companyTosCurrent,
  domainMatches,
  emailDomain,
  isWorkDomain,
} from "@/lib/tos";
import type { TaxType } from "@prisma/client";

/**
 * COMPANY — the identity primitive (brief_company_model).
 *
 * One building block used by BOTH onboarding tracks. Every buyer and every
 * provider is a company; a sole proprietor is a company of one, defined by the
 * person who is also its admin. There is no "individual" path — the tax type
 * carries that case, and it is what the payout gate reads later.
 *
 * Everything here is owner-scoped: the acting person is resolved from the
 * session, never from a body field.
 */

export type DefineInput = {
  name: string;
  taxType: TaxType;
  /** Jurisdiction (`E260`) — a full country name from `COUNTRIES`, not an ISO code. */
  country?: string | null;
  /** `E282` — the US state the company was filed in. Full name, not a code. */
  stateOfFiling?: string | null;
  /** `E273` — EIN / tax registration id. Writes to the existing `Company.tin`. */
  ein?: string | null;
  /** `E280` — the company's REGISTERED address (not the deliver-to). */
  registeredAddress?: {
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  website?: string | null;
  /** Public URL from /api/company/logo, uploaded before define (E168). */
  logoUrl?: string | null;
  /** "I'm authorized to represent this entity." Required. */
  attestation: boolean;
  /** Company ToS, accepted by the definer on the company's behalf. Required. */
  companyTos: boolean;
};

export type JoinInput = {
  companyId: string;
  attestation: boolean;
};

async function actingPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      company_id: true,
      site_id: true,
      company: { select: { id: true, name: true, p_account_id: true } },
      user: { select: { email: true } },
      requesterProfile: { select: { id: true, work_site_id: true } },
    },
  });
  if (!person) {
    throw new OnboardingError("This account has no person record", "INVALID");
  }
  return person;
}

/** The signup placeholder company: named after the person, nobody else in it. */
async function isPlaceholder(companyId: string): Promise<boolean> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      legal_name: true,
      tax_type: true,
      _count: { select: { people: true, memberships: true } },
    },
  });
  // A defined company has a tax type. A placeholder never does, and has exactly
  // one person (the account it was created for) and no memberships.
  return (
    !!c && !c.tax_type && c._count.people <= 1 && c._count.memberships === 0
  );
}

/**
 * DEFINE a company. The definer becomes its admin with an APPROVED membership,
 * and accepts the company ToS on its behalf.
 *
 * Reuses the signup placeholder rather than creating a second company: the
 * Person FK already points at it, and leaving it behind is how the database
 * fills with one empty company per signup.
 */
/**
 * The `Site.name` that holds a company's REGISTERED address (`E280`).
 *
 * ⚠ A NAMED CONSTANT because it is a LOOKUP KEY, not a label — a typo would
 * silently create a second site on every save instead of updating the one.
 * ⚠ DISTINCT FROM "Primary" (the requester's own address) and from the
 * requester's work site, which is referenced by id rather than by name.
 */
export const REGISTERED_SITE_NAME = "Registered";

/**
 * ⚠⚠ THE ONLY PLACE AN ENTITY VALIDATION IS WRITTEN (`P1-ALL-E282` WS-2).
 *
 * ── ⚠⚠ FOUR STORED STATES, NOT THREE ─────────────────────────────────────
 *
 * `not_found` · `in_good_standing` · `has_issues` · `standing_unknown`
 *
 * The fourth exists because NEW YORK PUBLISHES NO STANDING COLUMN — its adapter
 * is `publishesStatus: false`, *"there is no good-standing field to read"*.
 * ⚠ WITHOUT IT, NY WOULD HAVE TO BE RECORDED AS EITHER A PASS OR A PROBLEM, AND
 * BOTH WOULD BE CLAIMS NOBODY READ.
 *
 * ⚠ `not_in_good_standing` (the route's `ValidationOutcome`) IS DERIVED FROM A
 * BOOLEAN PREDICATE at `company-validation.ts:330`, which throws away WHY. The
 * reason was already in the payload the whole time: `EntityMatch.status` is a
 * `SourcedField` carrying the register's own text AND its URL. NOTHING NEEDED
 * SCRAPING — it needed storing.
 *
 * ⚠⚠ `entity_status_detail` IS ONLY EVER THE REGISTER'S STRING. Never a
 * Panameer summary, never a friendlier phrasing. `check:trust-claims` asserts it
 * appears verbatim in the match it came from.
 */
async function persistEntityValidation(
  companyId: string,
  input: { name: string; stateOfFiling: string | null; storedLegalName: string }
): Promise<void> {
  /* ⚠ NO STATE OF FILING, NO CALL. There is no register to ask. */
  const state = input.stateOfFiling?.trim();
  if (!state) return;

  try {
    /* ⚠ 5s, AND THE WHOLE THING IS INSIDE A CATCH. A dead register must not
       cost a user their company record. */
    const result = await validateEntity({
      name: input.name,
      stateOfFiling: state,
      timeoutMs: 5000,
    });

    /* ⚠ `ok: false` WRITES NOTHING — an unsupported state or an unreachable
       register is not a check, and recording one would be the E034 shape at
       rest: a claim the build cannot support. */
    if (!result.ok) return;

    let status: string;
    let detail: string | null = null;
    let sourceUrl: string | null = null;

    if (result.status === "not_found" || result.matches.length === 0) {
      /* ⚠ UNAMBIGUOUS AND WORTH RECORDING: we looked, and there was no such
         company. ⚠ NO SOURCE URL EXISTS for a non-match — there is no row to
         cite — so the status is stored WITHOUT one, which is the single
         legitimate exception to the SourcedField-at-rest rule and is why the
         harness scopes that assertion to statuses that name a match. */
      status = "not_found";
    } else {
      /* ⚠⚠ ONE MATCH ONLY. Several means the UI was asking the user which
         entity they meant; asserting a check across all of them would assert
         something about rows they never picked. */
      if (result.matches.length !== 1) return;
      const match = result.matches[0];

      /* ⚠⚠ AND THE NAME MUST STILL BE THE ONE THE REGISTER RETURNED. An edited
         name means the stored company is not the entity that was found. */
      const same =
        match.legalName.value.trim().toLowerCase() ===
        input.storedLegalName.trim().toLowerCase();
      if (!same) return;

      /* ⚠ THE URL IS THE MATCH'S OWN. NEVER SYNTHESISED. */
      sourceUrl = match.legalName.sourceUrl;
      if (!sourceUrl) return;

      if (!result.publishesStatus || !match.status) {
        /* ⚠ NEW YORK LANDS HERE. Found, but the register publishes no standing. */
        status = "standing_unknown";
      } else if (result.status === "not_in_good_standing") {
        status = "has_issues";
        /* ⚠⚠ VERBATIM, AND REQUIRED. An issue with no stated reason is an
           accusation, so a missing detail means the write does not happen. */
        detail = match.status.value;
        if (!detail?.trim()) return;
      } else {
        status = "in_good_standing";
        /* ⚠ THE REGISTER'S WORDS ARE KEPT EVEN ON A PASS, so the copy can
           attribute rather than paraphrase. */
        detail = match.status.value;
      }
    }

    /* ⚠ RE-RUNNING `defineCompany` SIMPLY OVERWRITES with the newer answer,
       which is correct: the register is the authority and the latest read of it
       is the best one we have. There is no history table by design. */
    await prisma.company.update({
      where: { id: companyId },
      data: {
        entity_validated_at: new Date(),
        entity_validation_status: status,
        entity_validation_source_url: sourceUrl,
        entity_status_detail: detail,
      },
    });
  } catch {
    /*
      ⚠⚠ SWALLOWED ON PURPOSE, AND THIS IS THE LOAD-BEARING PART. The company
      row is already saved. A register timeout, a schema change at the state's
      end, a 500 from Socrata — none of them may surface here, because the user
      would lose a company record over a third party's outage.
      ⚠ THE COST IS THAT A FAILED CHECK LOOKS IDENTICAL TO NO CHECK — both leave
      `entity_validated_at` NULL and the copy reads "not yet verified", which is
      TRUE in both cases. That is the right trade and it is why the column is
      nullable rather than defaulted.
    */
  }
}

export async function defineCompany(viewer: Viewer, input: DefineInput) {
  const person = await actingPerson(viewer);

  const name = input.name.trim();
  if (name.length < 2) {
    throw new OnboardingError("A company name is required", "INVALID");
  }
  if (!input.attestation) {
    throw new OnboardingError(
      "Please confirm you're authorized to represent this company",
      "INVALID"
    );
  }
  if (!input.companyTos) {
    throw new OnboardingError(
      "The company terms have to be accepted to continue",
      "INVALID"
    );
  }

  const domain = emailDomain(person.user?.email);
  const website = input.website?.trim() || null;

  const reuse = await isPlaceholder(person.company_id);
  const companyId = reuse
    ? person.company_id
    : (
        await prisma.company.create({
          data: {
            name,
            pAccount: {
              create: { kind: "BOTH", name, status: "ACTIVE" },
            },
          },
          select: { id: true },
        })
      ).id;

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      legal_name: name,
      tax_type: input.taxType,
      /* `E260` — jurisdiction, stored as the full country name. */
      country: input.country?.trim() || null,
      /* `E282` — nullable and back-fills nothing; existing companies predate it. */
      state_of_filing: input.stateOfFiling?.trim() || null,
      /*
        `E273` — EIN. ⚠ `tin` ALREADY EXISTED and was never captured; the
        column's own comment says it was "DEFERRED to the money gate on
        purpose". Scott has now asked for it at company creation, so the form
        catches up with the column. ⚠ STILL NULLABLE — see `E274`.
      */
      ...(input.ein?.trim() ? { tin: input.ein.trim() } : {}),
      website,
      ...(input.logoUrl ? { logo_url: input.logoUrl } : {}),
      // Only a WORK domain is stored. Recording gmail.com here would auto-
      // approve every Gmail user in the world into this company.
      email_domain: isWorkDomain(domain) ? domain : null,
      company_tos_accepted_by: person.id,
      company_tos_accepted_at: new Date(),
      company_tos_version: COMPANY_TOS_VERSION,
    },
    select: { id: true, name: true, p_account_id: true, legal_name: true },
  });

  /*
    ── ⚠⚠ THE ENTITY VALIDATION IS PERSISTED HERE (`P1-ALL-E282` WS-2) ─────────

    THE DEFECT THIS CLOSES: `validateEntity()` got a real answer from a state
    register, with a source URL, and NOTHING WROTE IT DOWN — so *"Company not
    yet verified"* could never flip, for anybody, ever.

    ── ⚠⚠ WHY HERE AND NOT IN `api/company/validate/route.ts` ────────────────

    That route's zod body is `{ name, stateOfFiling }` — NO ID — so it does not
    know WHICH company to write to. Its own docblock says *"THIS ROUTE NEVER
    WRITES... keeping the read and the write apart is what lets a user correct a
    bad lookup before anything is persisted"*, and the lookup re-runs on every
    search with the USER picking among several matches. ⚠ `check:trust-claims`
    now asserts that route still writes nothing — this brief is the most likely
    thing ever to break that split.

    ⚠⚠ AND THE CLIENT NEVER POSTS THE MATCH. `DefineInput` carries no validation
    fields and must not: accepting a status or a source URL from the browser is a
    FORGEABLE TRUST CLAIM. The call is made server-side, here, from the name and
    state this function already has.

    ── ⚠ IT MUST NEVER COST A USER THEIR COMPANY RECORD ──────────────────────

    The company row is already written above. This runs after, with a 5s timeout,
    inside a try/catch that swallows everything: A DEAD REGISTER MUST NOT FAIL
    THE SAVE. Decision 5 says a failed lookup never blocks onboarding, and that
    is still true.

    ── ⚠⚠ IT WRITES ONLY ON AN UNAMBIGUOUS ANSWER ────────────────────────────

    Several matches means the user was being asked which entity they meant, and
    an edited name means the stored company is not the one the register returned.
    Either way, asserting a check would be asserting something nobody confirmed.
    ⚠ `not_found` IS UNAMBIGUOUS AND DOES WRITE — "we looked and there was no
    such company" is a real, useful answer.
  */
  await persistEntityValidation(company.id, {
    name,
    stateOfFiling: input.stateOfFiling ?? null,
    storedLegalName: company.legal_name ?? name,
  });

  /*
    ── ⚠⚠ THE REGISTERED ADDRESS GOES ON THE BACKBONE (`P1-J1.1-E280`) ─────────

    ⚠ THE MODELLING CHOICE, AND WHY. Two options were on the table: a `Site` +
    `Address` on the existing backbone, or new address columns on `Company`.
    THIS IS THE SITE OPTION, and it wins on four counts:

      · `Company` ALREADY HAS `sites`, and `Address` is ALREADY the one postal-
        address entity in the schema. Columns on `Company` would create a SECOND
        way to store an address, and the two would drift.
      · The backbone is literally `P-Account → Company → Site → Address →
        Person`. Address-on-Company routes around the model the product is
        built on.
      · IT NEEDED NO SCHEMA CHANGE AT ALL — not even a `db:push`. The columns
        option would have added five or six.
      · `Site.name` keeps registered and deliver-to APART BY CONSTRUCTION: this
        one is "Registered", the requester's own is "Primary", and the work
        location is its own site on `RequesterProfile.work_site_id`.
        ⚠ SCOTT WAS EXPLICIT THAT THESE ARE NOT THE SAME ADDRESS — the ERP model
        carries a deliver-to per transaction, so merging them would make it
        impossible to have work delivered anywhere but head office.

    ⚠ IDEMPOTENT. It looks the site up by name rather than creating one every
    time — `defineCompany` can run again against a reused placeholder company
    (see `isPlaceholder` above), and a second "Registered" site would be a silent
    duplicate nothing reads.
    ⚠ `line1` IS NON-NULLABLE ON `Address`, so an unanswered street is stored as
    "" rather than refusing the write. `E274` allows a part-answered company; a
    required column must not turn that into a 500.
  */
  const reg = input.registeredAddress;
  if (reg && (reg.country || reg.line1 || reg.city)) {
    const data = {
      line1: reg.line1?.trim() || "",
      city: reg.city?.trim() || null,
      state: reg.state?.trim() || null,
      postal_code: reg.postalCode?.trim() || null,
      country: reg.country?.trim() || null,
    };
    const site =
      (await prisma.site.findFirst({
        where: { company_id: company.id, name: REGISTERED_SITE_NAME },
        select: { id: true },
      })) ??
      (await prisma.site.create({
        data: { company_id: company.id, name: REGISTERED_SITE_NAME },
        select: { id: true },
      }));
    const existing = await prisma.address.findFirst({
      where: { site_id: site.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.address.update({ where: { id: existing.id }, data });
    } else {
      await prisma.address.create({ data: { site_id: site.id, ...data } });
    }
  }

  // Keep the P-Account name in step — it is the placeholder's person-name
  // otherwise, and the admin console lists accounts by it.
  await prisma.pAccount.update({
    where: { id: company.p_account_id },
    data: { name },
  });

  await prisma.companyMembership.upsert({
    where: { person_id_company_id: { person_id: person.id, company_id: company.id } },
    update: {
      role: "ADMIN",
      status: "APPROVED",
      attestation_accepted_at: new Date(),
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
    create: {
      person_id: person.id,
      company_id: company.id,
      role: "ADMIN",
      status: "APPROVED",
      attestation_accepted_at: new Date(),
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
  });

  if (!reuse) await moveInto(person.id, company.id, person.company_id);
  await refreshProviderScore(person.id);

  return { companyId: company.id, name: company.name, status: "APPROVED" as const };
}

/**
 * JOIN an existing company. Auto-approved on a work-email domain match,
 * otherwise a PENDING request for that company's admin.
 *
 * A PENDING joiner is NOT moved onto the company — they stay where they are
 * until somebody approves. Moving first would give an unapproved person a
 * company binding, which is the exact hole this brief closes.
 */
export async function joinCompany(viewer: Viewer, input: JoinInput) {
  const person = await actingPerson(viewer);

  if (!input.attestation) {
    throw new OnboardingError(
      "Please confirm you're authorized to represent this company",
      "INVALID"
    );
  }

  const target = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, name: true, email_domain: true },
  });
  if (!target) throw new OnboardingError("That company no longer exists", "INVALID");
  if (target.id === person.company_id) {
    return { companyId: target.id, name: target.name, status: "APPROVED" as const };
  }

  const auto = domainMatches(person.user?.email, target.email_domain);
  const now = new Date();

  const membership = await prisma.companyMembership.upsert({
    where: { person_id_company_id: { person_id: person.id, company_id: target.id } },
    update: {
      // Re-requesting after a rejection reopens the SAME row rather than
      // stacking requests, so an admin sees one decision to make.
      status: auto ? "APPROVED" : "PENDING",
      attestation_accepted_at: now,
      auto_approved: auto,
      decided_at: auto ? now : null,
      decided_by_person_id: null,
    },
    create: {
      person_id: person.id,
      company_id: target.id,
      role: "MEMBER",
      status: auto ? "APPROVED" : "PENDING",
      attestation_accepted_at: now,
      auto_approved: auto,
      decided_at: auto ? now : null,
    },
    select: { status: true },
  });

  if (auto) await moveInto(person.id, target.id, person.company_id);
  if (auto) await refreshProviderScore(person.id);

  return {
    companyId: target.id,
    name: target.name,
    status: membership.status,
    autoApproved: auto,
  };
}

/**
 * Move a person onto their approved company, taking their sites with them.
 *
 * The sites carry the addresses they typed during onboarding — their own and
 * the engagement deliver-to — and they were created under the placeholder. Left
 * behind they would be deleted with it; cleared, the requester loses two
 * addresses they already entered. Re-pointing keeps both, and a requester's
 * deliver-to belongs to their company anyway.
 */
async function moveInto(personId: string, companyId: string, fromCompanyId: string) {
  if (companyId === fromCompanyId) return;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      site_id: true,
      requesterProfile: { select: { work_site_id: true } },
    },
  });
  const siteIds = [
    person?.site_id,
    person?.requesterProfile?.work_site_id,
  ].filter((x): x is string => !!x);

  if (siteIds.length > 0) {
    await prisma.site.updateMany({
      where: { id: { in: siteIds }, company_id: fromCompanyId },
      data: { company_id: companyId },
    });
  }

  await prisma.person.update({
    where: { id: personId },
    data: { company_id: companyId },
  });

  await cleanUpPlaceholder(fromCompanyId);
}

/** Delete the signup placeholder once its last person leaves it. */
export async function cleanUpPlaceholder(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      p_account_id: true,
      tax_type: true,
      _count: { select: { people: true, memberships: true } },
      pAccount: { select: { _count: { select: { companies: true } } } },
    },
  });
  // Never delete a DEFINED company, however empty it looks — that is somebody's
  // legal entity, not signup residue.
  if (
    !company ||
    company.tax_type ||
    company._count.people > 0 ||
    company._count.memberships > 0
  ) {
    return;
  }

  await prisma.company.delete({ where: { id: company.id } });
  if (company.pAccount._count.companies <= 1) {
    await prisma.pAccount.delete({ where: { id: company.p_account_id } });
  }
}

/**
 * Companies a person can join. Names, domain and headcount only.
 *
 * E167 — "typing straterp returns nothing" turned out NOT to be a broken query.
 * The match was already case-insensitive `contains`; what was missing was the
 * company. Of 40 rows in the dev database, 39 were signup placeholders named
 * after a person and exactly one had ever been defined, and placeholders are
 * deliberately not joinable — joining "Robin Crosby" is not joining a company.
 * So the search was right and the empty state was the whole story; it now says
 * so, and offers the way out.
 *
 * Two real improvements while here: LEGAL NAME is searched too (a company can
 * trade as one name and file as another, and the joiner may know either), and
 * matching is on either field rather than the display name alone.
 */
export async function searchCompanies(q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { legal_name: { contains: term, mode: "insensitive" } },
      ],
      // Only DEFINED companies are joinable. Signup placeholders are named
      // after a person and are not entities anyone should be joining.
      tax_type: { not: null },
    },
    orderBy: { name: "asc" },
    take: 8,
    select: {
      id: true,
      name: true,
      email_domain: true,
      _count: { select: { memberships: { where: { status: "APPROVED" } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.email_domain,
    members: c._count.memberships,
  }));
}

export type CompanyBinding = Awaited<ReturnType<typeof getCompanyBinding>>;

/**
 * The viewer's company binding — the one read every gate and page uses.
 *
 * Returns the APPROVED membership when there is one, otherwise the most recent
 * pending/rejected request, so a page can say "waiting on Acme" rather than
 * "no company".
 */
/*
  ⚠ TAKES `Pick<Viewer, "userId">`, NOT A WHOLE `Viewer` — widened, not changed.

  The body only ever reads `viewer.userId`, and `brief_assessment_instance_model`
  needs to call this from `/assess/claim`, where the user has just been CREATED
  and there is no session to build a Viewer from yet. The alternatives were both
  worse: fabricate a Viewer with invented role flags, or re-implement the
  membership query beside this one — and a second copy of "which company is this
  person actually in" is how `Person.company_id` gets used as a company again
  (P1-J1.2-E003). Every existing caller passes a full Viewer and still compiles.
*/
export async function getCompanyBinding(viewer: Pick<Viewer, "userId">) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      company_id: true,
      companyMemberships: {
        orderBy: [{ status: "asc" }, { updated_at: "desc" }],
        select: {
          id: true,
          role: true,
          status: true,
          auto_approved: true,
          created_at: true,
          company: {
            select: {
              id: true,
              name: true,
              legal_name: true,
              tax_type: true,
              website: true,
              logo_url: true,
              email_domain: true,
              company_tos_accepted_at: true,
              company_tos_version: true,
              company_tos_accepted_by: true,
            },
          },
        },
      },
    },
  });
  if (!person) return null;

  const approved = person.companyMemberships.find((m) => m.status === "APPROVED");
  const pending = person.companyMemberships.find((m) => m.status === "PENDING");
  const rejected = person.companyMemberships.find((m) => m.status === "REJECTED");
  const m = approved ?? pending ?? rejected ?? null;
  if (!m) return null;

  return {
    personId: person.id,
    membershipId: m.id,
    role: m.role,
    status: m.status,
    autoApproved: m.auto_approved,
    company: m.company,
    tosCurrent: companyTosCurrent(m.company),
    isAdmin: m.role === "ADMIN" && m.status === "APPROVED",
  };
}

/** Pending join requests for the companies this viewer administers. */
export async function getPendingRequests(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      companyMemberships: {
        where: { role: "ADMIN", status: "APPROVED" },
        select: { company_id: true },
      },
    },
  });
  const adminOf = (person?.companyMemberships ?? []).map((m) => m.company_id);
  if (adminOf.length === 0) return [];

  const rows = await prisma.companyMembership.findMany({
    where: { company_id: { in: adminOf }, status: "PENDING" },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      created_at: true,
      company: { select: { id: true, name: true } },
      person: {
        select: {
          first_name: true,
          last_name: true,
          title: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  return rows;
}

/**
 * Approve or reject a pending request.
 *
 * AUTHORISATION IS THE POINT of this function: the acting viewer must hold an
 * APPROVED ADMIN membership on the same company as the request. The membership
 * id alone is not enough — anyone could guess one — so the company is read from
 * the request and checked against the actor's own admin rows.
 */
export async function decideRequest(
  viewer: Viewer,
  membershipId: string,
  decision: "APPROVED" | "REJECTED"
) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OnboardingError("No person record", "INVALID");

  const target = await prisma.companyMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, company_id: true, person_id: true, status: true },
  });
  if (!target) throw new OnboardingError("That request no longer exists", "INVALID");

  const actorIsAdmin = await prisma.companyMembership.findFirst({
    where: {
      person_id: person.id,
      company_id: target.company_id,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });
  if (!actorIsAdmin) {
    throw new OnboardingError("You don't administer that company", "INVALID");
  }
  if (target.status !== "PENDING") {
    throw new OnboardingError("That request has already been decided", "INVALID");
  }

  await prisma.companyMembership.update({
    where: { id: target.id },
    data: {
      status: decision,
      decided_at: new Date(),
      decided_by_person_id: person.id,
    },
  });

  if (decision === "APPROVED") {
    const joiner = await prisma.person.findUnique({
      where: { id: target.person_id },
      select: { company_id: true },
    });
    if (joiner) await moveInto(target.person_id, target.company_id, joiner.company_id);
    await refreshProviderScore(target.person_id);
  }

  return { ok: true as const, status: decision };
}

/** Accept (or re-accept) the company ToS. Admins only. */
export async function acceptCompanyTos(viewer: Viewer, companyId: string) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new OnboardingError("No person record", "INVALID");

  const isAdmin = await prisma.companyMembership.findFirst({
    where: {
      person_id: person.id,
      company_id: companyId,
      role: "ADMIN",
      status: "APPROVED",
    },
    select: { id: true },
  });
  if (!isAdmin) {
    throw new OnboardingError(
      "Only a company admin can accept the company terms",
      "INVALID"
    );
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      company_tos_accepted_by: person.id,
      company_tos_accepted_at: new Date(),
      company_tos_version: COMPANY_TOS_VERSION,
    },
  });
  return { ok: true as const };
}

/**
 * A company binding is part of the provider REQUIRED SET (WS6), so gaining one
 * changes the completeness score — and the score is stored, not computed on
 * read. Without this the review page shows a stale number straight after the
 * company step, which reads as "I did that and nothing happened".
 *
 * Silent when the person has no provider profile: buyers and requesters go
 * through the same company code and have no score to recompute.
 */
async function refreshProviderScore(personId: string): Promise<void> {
  try {
    const profile = await prisma.providerProfile.findFirst({
      where: { person_id: personId },
      select: { id: true },
    });
    if (profile) await recomputeCompleteness(profile.id);
  } catch (e) {
    console.error("[company] completeness refresh failed (non-fatal):", e);
  }
}
