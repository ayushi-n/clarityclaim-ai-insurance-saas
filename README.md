# ClarityClaim

Multi-agent AI insurance claim analysis — rebuilt as a production-shaped
Next.js SaaS. This replaces the original Streamlit prototype (kept for
reference in `legacy-streamlit/`) with a real app: marketing site, auth,
and a full claims dashboard, themed with the lotus-pond palette from the
brand reference image.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | React 18, Tailwind CSS, Framer Motion, Recharts |
| Auth | NextAuth (credentials provider) |
| Database | PostgreSQL + Prisma |
| LLM pipeline | Anthropic API (`src/lib/anthropic-pipeline.ts`) |
| Payments | Stripe (stubbed — add keys to enable) |
| File uploads | UploadThing (stubbed — add keys to enable) |
| Background jobs | Upstash Redis + QStash (for the 5+ sequential agent calls per claim) |

## Design

Palette pulled directly from the brand reference: dark green `#0A3323`,
moss `#839958`, beige `#F7F4D5`, rosy brown `#D3968C`, midnight green
`#105666`. The through-line is literal: a claim starts turbulent, and a
decision is the moment it settles clear — reflected in the ripple
signature element on the hero/auth screens, the "settle" animation on
the floating decision card, and the wave dividers between sections.

Type: **Fraunces** (display, headings) + **Manrope** (body) + **JetBrains
Mono** (claim numbers, scores, timestamps). All three load via
`next/font/google` in `src/app/layout.tsx` — this requires network access
to Google Fonts at build time (available on Vercel; not available in this
sandboxed environment, so a full `next build` could not be verified here).

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL at minimum
npx prisma db push          # create tables
npx prisma db seed          # optional: demo org + user
npm run dev
```

Demo login after seeding: `demo@meridianmutual.com` / `clarity-demo-2026`.

## What's wired up vs. stubbed

**Fully wired, real API routes (all Prisma-backed, org-scoped):**
- Landing page, `/login`, `/signup` (real Prisma-backed signup + NextAuth session)
- `src/middleware.ts` — protects every `/dashboard/*` route at the edge
- `POST /api/claims` — creates a claim, then enqueues the agent pipeline via `src/lib/queue.ts`
- `GET /api/claims`, `GET /api/claims/[id]` — org-scoped reads
- `POST /api/claims/[id]/decision` — the Approve/Deny/Escalate action
- `POST /api/pipeline/run` — the QStash worker that runs all six agents
  sequentially and writes every finding back to the claim (falls back to
  a direct, un-queued `fetch` in local dev if `QSTASH_TOKEN` isn't set)
- `POST/GET /api/uploadthing` — evidence file uploads, tied to a claim
  via an `x-claim-id` header and written to the `Evidence` table on
  completion; wired into the claim-intake page's dropzone
- `POST /api/stripe/checkout`, `POST /api/stripe/webhook` — Growth-plan
  checkout and the webhook that flips `Organization.planTier`
- `src/lib/anthropic-pipeline.ts` — the six agents from the original
  `agents/*.py` files, ported to typed functions that call the Anthropic
  API directly

**Demo data, ready to swap for live queries:**
- Dashboard *pages* (`overview`, `claims`, `claims/[id]`, `reviews`,
  `reports`) still render from `src/lib/mock-data.ts` so the UI looks
  populated with zero setup. The API routes above already read/write the
  real database — swap the page-level imports for `fetch("/api/claims")`
  (or a server-side `db.claim.findMany(...)`) once you want the
  dashboard to reflect real claims instead of the demo set.

**Needs your API keys to go live:**
- `ANTHROPIC_API_KEY` for the pipeline to actually reason over claims
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PRICE_GROWTH` for billing
- `UPLOADTHING_TOKEN` for evidence uploads
- `QSTASH_TOKEN` (+ `UPSTASH_REDIS_REST_URL/TOKEN` if you add rate limiting) to queue the pipeline properly in production

## Folder map

```
src/app/                landing, login, signup, dashboard/*, api/*
src/components/landing   marketing sections
src/components/auth      login/signup shell + form field
src/components/dashboard sidebar, topbar, tables, charts, decision panel
src/lib/                 db.ts, auth.ts, anthropic-pipeline.ts, mock-data.ts
prisma/schema.prisma     data model
legacy-streamlit/        original Streamlit app, kept for reference
```
