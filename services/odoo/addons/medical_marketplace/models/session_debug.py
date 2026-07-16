import logging

from odoo import models
from odoo.http import request

_logger = logging.getLogger(__name__)


class MedicalMarketplaceSessionDebug(models.AbstractModel):
    """Diagnostic override: logs the resolved session state right at the
    point Odoo's auth check runs.

    IMPORTANT: earlier version of this file hooked _dispatch(), which
    turned out to be the wrong point — for auth='user' routes,
    SessionExpiredException is raised inside _authenticate(), which is
    called by the dispatcher BEFORE _dispatch() is ever reached. That's why
    the previous version logged /api/products (auth='public', passes
    _authenticate trivially) but never logged /api/rfq (auth='user',
    throws inside _authenticate, so _dispatch never runs).

    This version hooks _authenticate() directly, on both entry and on
    exception, so it fires regardless of whether auth succeeds or fails.
    Uses *args/**kwargs since the exact signature of _authenticate has
    changed across Odoo versions.

    Remove this once the session issue is confirmed fixed; it's noisy in
    production logs.
    """
    _inherit = 'ir.http'

    @classmethod
    def _authenticate(cls, *args, **kwargs):
        path = None
        try:
            path = request.httprequest.path
            if path.startswith('/api/'):
                _logger.info(
                    "PRE-AUTH _authenticate ENTRY %s method=%s sid=%s uid=%s "
                    "db=%s raw_cookie_header=%r",
                    path,
                    request.httprequest.method,
                    request.session.sid,
                    request.session.uid,
                    request.session.db,
                    request.httprequest.headers.get('Cookie'),
                )
        except Exception:
            _logger.exception("Diagnostic pre-log failed")

        try:
            result = super()._authenticate(*args, **kwargs)
            if path and path.startswith('/api/'):
                _logger.info(
                    "PRE-AUTH _authenticate OK %s sid=%s uid=%s db=%s",
                    path, request.session.sid, request.session.uid, request.session.db,
                )
            return result
        except Exception as e:
            try:
                if path and path.startswith('/api/'):
                    _logger.info(
                        "PRE-AUTH _authenticate RAISED %s: %r sid=%s uid=%s db=%s "
                        "raw_cookie_header=%r",
                        path, e,
                        request.session.sid, request.session.uid, request.session.db,
                        request.httprequest.headers.get('Cookie'),
                    )
            except Exception:
                _logger.exception("Diagnostic exception-log failed")
            raise