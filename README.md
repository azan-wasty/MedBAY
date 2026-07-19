# MedBAY — B2B Medical Equipment Marketplace

A verified B2B marketplace for sourcing medical equipment: Odoo 17
(Community Edition) as the backend ERP — via a custom `medical_marketplace`
addon — with a Next.js storefront, orchestrated with Docker Compose.

Buyers browse a verified supplier catalog, submit RFQs, track orders from
confirmation through delivery, leave reviews, and request returns. Admins
verify buyer organizations, quote and manage RFQs, and assign carriers /
shipment tracking — all from Odoo-backed data exposed through a small
Next.js API layer.

## Project structure

```
medbay/
├── services/
│   ├── odoo/
│   │   ├── addons/medical_marketplace/   # custom Odoo module
│   │   │   ├── controllers/main.py       # REST-ish JSON endpoints consumed by the frontend
│   │   │   ├── models/                   # partner verification, returns, reviews, carriers, ...
│   │   │   ├── data/                     # return reasons, buyer-stage labels, carriers, mail templates
│   │   │   ├── views/                    # backend UI for admin-side Odoo config
│   │   │   └── security/
│   │   └── config/odoo.conf
│   └── frontend/                         # Next.js 14 app (TypeScript, App Router)
│       ├── src/app/                      # pages + API routes (route handlers proxy to Odoo)
│       ├── src/components/
│       │   ├── ui/                       # shadcn/ui-style primitives (button, dialog, tabs, ...)
│       │   ├── shared/                   # Container, SectionHeading, Reveal, PulseLine, Logo
│       │   ├── layout/                   # Navbar, Footer
│       │   ├── home/                     # homepage sections (Hero, FeaturedCatalog, FAQ, ...)
│       │   ├── products/                 # ProductCard
│       │   └── dashboard/                # OrderStepper
│       ├── src/lib/                      # constants (all copy/labels), odooClient, utils
│       └── Dockerfile
├── docker-compose.yml
├── .env                                  # used by Compose & all services (gitignored)
├── .env.example                          # template for the root .env
└── README.md
```

## Tech stack

| Layer      | Stack |
|------------|-------|
| Backend    | Odoo 17 CE + custom `medical_marketplace` addon (Python) |
| Database   | Postgres 15 |
| Frontend   | Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui-style components on Radix, Framer Motion, Lucide icons |
| Auth       | Odoo session cookie (httpOnly) issued via `/api/auth/login`, mirrored to `localStorage` for client-side UI state |
| Orchestration | Docker Compose |

## Prerequisites

- Docker + Docker Compose. No local Odoo or Postgres install needed —
  everything runs in containers.

## Running it

```bash
docker compose up --build
```

| Service   | What it is             | Reachable at |
|-----------|-------------------------|--------------|
| `odoo-db` | Postgres for Odoo       | internal only |
| `odoo`    | Odoo 17 + marketplace addon | `http://localhost:${ODOO_PORT}` (see your `.env`; defaults to `8069` if unset) |
| `frontend`| Next.js dev server      | `http://localhost:${FRONTEND_PORT}` (defaults to `3000`) |

### First-time Odoo setup

1. Go to `http://localhost:${ODOO_PORT}`.
2. On first run, Odoo prompts you to create a database — use the master
   password from the root `.env` (`ODOO_ADMIN_PASSWORD`).
3. In the Odoo backend, open **Apps**, remove the default "Apps" filter,
   search **Medical Marketplace**, and install it. This loads the
   marketplace's models, security rules, return reasons, carrier config,
   and mail templates.
4. The frontend at `http://localhost:${FRONTEND_PORT}` now reads/writes
   through that addon.

### Rebuilding after a dependency change

The `frontend` service keeps `node_modules` in an anonymous Docker volume
(see `docker-compose.yml`), so a plain rebuild can still serve a stale
install after `package.json` changes:

```bash
docker compose build frontend
docker compose up -d --force-recreate --renew-anon-volumes frontend
```

### Verifying data persistence

```bash
docker compose down
docker compose up
```

Your Odoo database and app installs should still be there — `odoo-db-data`
and `odoo-web-data` are named volumes, not container-local storage.

## What's implemented

- **Catalog** — searchable/filterable product catalog with categories,
  variants (attributes → priced combinations), MOQ, certifications, and
  live stock status
- **RFQ flow** — cart → submit RFQ → admin quotes it → buyer reviews and
  approves → becomes a confirmed order
- **Order tracking** — buyer-facing stage stepper (Ordered → Processing →
  Out for Delivery → Delivered → Completed, plus Return Requested /
  Cancelled branch states), carrier + tracking reference, shipment and
  invoice status
- **Reviews** — one rating + review per completed order, deletable by the
  author
- **Returns** — refund/replacement requests against completed orders with
  categorized reasons; admin approve/reject
- **Buyer verification** — organizations register and are reviewed by an
  admin before they can transact
- **Admin console** — three tabs: company verification, return requests,
  and order tracking/carrier assignment

## Frontend design system

The storefront was redesigned as an enterprise-grade B2B experience
(mobile-first, WCAG-conscious, motion respecting `prefers-reduced-motion`)
while every data fetch, handler, and route from the original implementation
was kept as-is — only presentation changed.

- **Tokens**: brand (teal), azure (blue), and ink (navy) color scales in
  `tailwind.config.ts`; shadcn-style CSS variables in `globals.css`
- **Fonts**: Inter (body/UI), Space Grotesk (display), JetBrains Mono
  (reference numbers/prices) — self-hosted via `@fontsource`, no
  build-time call to Google's font CDN
- **Signature motif**: an animated EKG "pulse line" used as a section
  divider and hero accent (`components/shared/PulseLine.tsx`)
- **Primitives**: `components/ui/*` — Radix + CVA, in the same pattern
  `shadcn/ui` generates, hand-authored rather than pulled from a registry
- All page-level copy still lives in `src/lib/constants.ts`, including the
  new homepage marketing content (hero, stats, categories, benefits,
  testimonials, FAQ)

## Environment variables

All variables are consolidated in the root `.env` (gitignored); see
`.env.example` for the required names. Notably:

- `ODOO_API_BASE_URL` — server-side (Next.js route handlers → Odoo, via
  the Docker service name, e.g. `http://odoo:8069`)
- `NEXT_PUBLIC_ODOO_API_BASE_URL` — client-side/browser (must use the
  host-exposed port, e.g. `http://localhost:9000`, since the browser
  can't resolve Docker service names)

## Notes on networking

- **Odoo → Postgres**: the `odoo` service connects to `odoo-db` by Docker
  Compose service name (`db_host = odoo-db`), not `localhost` — inside a
  container, `localhost` refers to that container itself.
- **Frontend → Odoo**: server-side Next.js code (API routes) reaches Odoo
  via the service name (`http://odoo:8069`); client-side/browser code
  needs the host-exposed port instead, since it can't see Docker service
  names.

## Credentials (local dev only)

See the root `.env` — do not reuse these values outside local development.

## Not yet included

- No automated test suite or CI pipeline
- No image CDN/optimization pipeline (product images are served as
  base64/data URIs from Odoo or plain `<img>` tags)
- No production secrets management beyond the gitignored `.env`