# Medical Marketplace — B2B ERP + Storefront

Odoo 17 (Community Edition) as the backend ERP, Next.js as a custom
storefront, orchestrated with Docker Compose.

**Status: Phase 1 — infrastructure only.** No custom Odoo module and no
frontend-Odoo integration yet. This phase just proves the three containers
run, talk to each other correctly, and persist data.

## Project structure

```
medical-marketplace/
├── services/
│   ├── odoo/
│   │   ├── addons/          # empty for now — custom module goes here later
│   │   └── config/
│   │       └── odoo.conf
│   └── frontend/            # Next.js app (TypeScript)
│       ├── src/app/
│       └── Dockerfile
├── docker-compose.yml
├── .env                     # used by Compose & all services for unified config (gitignored)
├── .env.example             # template for the root .env
├── .gitignore
└── README.md
```

## Prerequisites

- Docker + Docker Compose installed. No local Odoo or Postgres install needed —
  everything runs in containers.

## Running it

```bash
docker compose up --build
```

This starts three services:

| Service   | What it is                          | Reachable at            |
|-----------|--------------------------------------|--------------------------|
| `odoo-db` | Postgres for Odoo                    | internal only (port 5432 on the Docker network) |
| `odoo`    | Odoo 17 Community web app            | http://localhost:8069    |
| `frontend`| Next.js dev server                   | http://localhost:3000    |

### First-time Odoo setup

1. Go to `http://localhost:8069`.
2. Odoo will prompt you to create a database (first run only). Use the
   master password from the root `.env` file (`ODOO_ADMIN_PASSWORD`).
3. Once the database is created, you land in the Odoo backend. At this
   point there's no custom module installed yet — that's Phase 2.

### Checking the frontend

`http://localhost:3000` should show a placeholder page confirming the
Next.js container is up. No Odoo data is fetched yet.

## Verifying data persistence

```bash
docker compose down
docker compose up
```

Go back to `http://localhost:8069` — your database and any changes you
made should still be there. This works because `odoo-db-data` and
`odoo-web-data` are named Docker volumes (see bottom of
`docker-compose.yml`), not container-local storage.

## Notes on networking

- **Odoo → Postgres**: the `odoo` service connects to `odoo-db` using the
  Docker Compose service name as the hostname (`db_host = odoo-db` in
  `odoo.conf`), not `localhost`. Inside a container, `localhost` refers to
  that container itself.
- **Frontend → Odoo**: once we build the API layer (Phase 2+), *server-side*
  Next.js code (API routes, server components) will reach Odoo via the
  service name (`http://odoo:8069`), same reasoning as above. *Client-side*
  (browser) code cannot see Docker service names at all — it needs the
  host-exposed port (`http://localhost:8069`). Both are already stubbed in
  `services/frontend/.env` as `ODOO_API_BASE_URL` and
  `NEXT_PUBLIC_ODOO_API_BASE_URL` respectively.

## Credentials (local dev only)

See the root `.env` file — do not reuse these values outside local
development. All environment variables have been consolidated into a single
root-level file to simplify orchestration and local development.
Actual `.env` files are gitignored; the `.env.example` file at the project root shows
the required variable names for anyone cloning the repo.

## What's NOT in this phase

- No custom Odoo module (`medical_marketplace` addon) yet
- No API layer between Odoo and Next.js yet
- No real frontend pages beyond a placeholder
- No RFQ / quotation flow yet

These come in later phases.
