#!/bin/bash
set -e

# ── Connection params (match Railway service variable names exactly) ───────────
DB_HOST="${HOST:-postgres.railway.internal}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${USER:-odoo_user}"
DB_PASS="${PASSWORD}"
DB_NAME="${ODOO_DB_NAME:-odoo}"

# Railway injects PORT — Odoo must listen here for health checks to pass
HTTP_PORT="${PORT:-8069}"

# ── Wait for Postgres ─────────────────────────────────────────────────────────
echo "==> Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
until python3 - <<EOF 2>/dev/null
import psycopg2, sys
try:
    psycopg2.connect(host="${DB_HOST}", port=${DB_PORT}, user="${DB_USER}",
                     password="${DB_PASS}", dbname="postgres", connect_timeout=3)
    sys.exit(0)
except Exception as e:
    print(e, file=sys.stderr); sys.exit(1)
EOF
do
    echo "  Postgres not ready yet — retrying in 3s..."
    sleep 3
done
echo "==> Postgres is ready."

# ── Check if the Odoo database already exists ─────────────────────────────────
DB_EXISTS=$(python3 - <<EOF
import psycopg2
conn = psycopg2.connect(host="${DB_HOST}", port=${DB_PORT}, user="${DB_USER}",
                        password="${DB_PASS}", dbname="postgres")
cur = conn.cursor()
cur.execute("SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'")
print("yes" if cur.fetchone() else "no")
conn.close()
EOF
)

# ── Phase 1: install (fresh DB) or upgrade (existing DB) ─────────────────────
if [ "$DB_EXISTS" = "yes" ]; then
    echo "==> [1/3] Database '${DB_NAME}' exists — upgrading medical_marketplace..."
    INIT_FLAG="-u"
else
    echo "==> [1/3] Database '${DB_NAME}' not found — initialising with medical_marketplace..."
    INIT_FLAG="--init"
fi

odoo -c /etc/odoo/odoo.conf \
    --db_host="${DB_HOST}" \
    --db_port="${DB_PORT}" \
    -r "${DB_USER}" \
    -w "${DB_PASS}" \
    -d "${DB_NAME}" \
    ${INIT_FLAG}=medical_marketplace \
    --without-demo=all \
    --stop-after-init

# ── Phase 2: clear stale asset attachment records ─────────────────────────────
# Railway containers are ephemeral — the filestore (/var/lib/odoo) is wiped on
# every redeploy, but the Postgres ir_attachment records pointing to those files
# persist. Odoo finds the record, tries to read a file that no longer exists,
# and returns 500 immediately. Deleting the records forces Odoo to regenerate
# fresh bundles on the first request.
echo "==> [2/3] Clearing stale asset attachment records from DB..."
python3 - <<EOF
import psycopg2
conn = psycopg2.connect(host="${DB_HOST}", port=${DB_PORT}, user="${DB_USER}",
                        password="${DB_PASS}", dbname="${DB_NAME}")
cur = conn.cursor()
cur.execute("DELETE FROM ir_attachment WHERE url ILIKE '/web/assets/%'")
deleted = cur.rowcount
conn.commit()
conn.close()
print(f"  Cleared {deleted} stale asset record(s).")
EOF

# ── Phase 3: start the HTTP web server on Railway's expected PORT ─────────────
echo "==> [3/3] Starting Odoo web server on port ${HTTP_PORT}..."
exec odoo -c /etc/odoo/odoo.conf \
    --db_host="${DB_HOST}" \
    --db_port="${DB_PORT}" \
    -r "${DB_USER}" \
    -w "${DB_PASS}" \
    -d "${DB_NAME}" \
    --db-filter="^${DB_NAME}$" \
    --http-port="${HTTP_PORT}" \
    --without-demo=all
