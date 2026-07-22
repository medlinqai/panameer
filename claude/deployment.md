# Deployment

Hosting, DNS, environments, and secrets for Panameer. Same infra family as
Medlinq.

---

## Environments & hosting

- **Code:** GitHub — `github.com/medlinqai/panameer`.
- **Front end / app hosting:** Vercel (deploy from `main`). Add a
  `vercel.json` if cron or route config is needed.
- **Database + storage + (optional) auth:** Supabase (Postgres). Separate
  Supabase project from Medlinq — never share a project.
- **Email:** Resend (transactional). Verify a sending domain before leaving
  the `onboarding@resend.dev` sandbox sender.
- **Domain registrar / DNS:** GoDaddy — `panameer.com`. DNS records managed
  in the GoDaddy DNS panel.
- **Hostinger:** role TBD — confirm whether Hostinger hosts anything for
  Panameer (marketing site, email, cPanel) vs. Vercel owning the app. Record
  the decision here once locked.

---

## Local dev

- App runs on **port 3100** (`npm run dev`) so it coexists with Medlinq
  (3000). See `decisions-01.md`.
- Copy `.env.example` → `.env.local` and fill values. `.env.local` is
  gitignored.

---

## Environment variables

| Var | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | — | `http://localhost:3100` in dev; prod URL on Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | server-only, never exposed |
| `DATABASE_URL` | Supabase → Database (pooled, 6543, `?pgbouncer=true`) | Prisma runtime |
| `DIRECT_URL` | Supabase → Database (direct, 5432) | Prisma migrations |
| `RESEND_API_KEY` | Resend dashboard | server-only |
| `EMAIL_FROM` | — | verified sender once domain is set |

Set the same vars in the Vercel project (Production + Preview). Never commit
real secrets.

---

## DNS (GoDaddy — panameer.com)

Record the live records here as they're set (A / CNAME for Vercel, MX + SPF /
DKIM / DMARC for email via Resend/host). As of kickoff the zone already has
records for `n8n`, cPanel, Outlook/Microsoft, and Lync/Skype — audit these
before adding Vercel + Resend records so nothing collides.

---

> Update this file whenever hosting, DNS, or a secret's source changes.
