FROM odoo:17.0

# Bake the custom addon and config into the image (no volume mounts on Railway)
COPY services/odoo/addons/medical_marketplace /mnt/extra-addons/medical_marketplace
COPY services/odoo/config/odoo.railway.conf /etc/odoo/odoo.conf

# Copy our startup script to a separate path so it doesn't conflict with
# the official Odoo image's /entrypoint.sh
COPY services/odoo/entrypoint.sh /start.sh

USER root
RUN chown -R odoo:odoo /mnt/extra-addons && \
    chmod +x /start.sh
USER odoo

EXPOSE 8069 8072

# Override the base image ENTRYPOINT so Railway runs our two-phase script directly.
# Our script handles:
#   1. Waiting for Postgres
#   2. --init (fresh DB) or -u (existing DB) for medical_marketplace
#   3. Starting Odoo on $PORT (Railway's health-check port)
#
# Required Railway service variables:
#   HOST                = postgres.railway.internal
#   POSTGRES_PORT       = 5432
#   USER                = odoo_user
#   PASSWORD            = OdooRailway2024!
#   ODOO_DB_NAME        = odoo
#   ODOO_ADMIN_PASSWORD = MedBay
#   PORT                = 8069   ← ADD THIS to Railway so health checks know the port
ENTRYPOINT ["/start.sh"]
