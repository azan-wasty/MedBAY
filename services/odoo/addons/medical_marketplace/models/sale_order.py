import logging

from odoo import models

_logger = logging.getLogger(__name__)


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    def write(self, vals):
        # Capture which orders are transitioning INTO 'sent' before the
        # write actually happens, so we notify exactly once per real
        # draft -> sent transition (not on every write that happens to
        # already have state == 'sent').
        newly_quoted = self.env['sale.order']
        if vals.get('state') == 'sent':
            newly_quoted = self.filtered(lambda o: o.state != 'sent')

        res = super().write(vals)

        for order in newly_quoted:
            order._send_quotation_notification()

        return res

    def _send_quotation_notification(self):
        template = self.env.ref(
            'medical_marketplace.email_template_rfq_quoted', raise_if_not_found=False
        )
        if not template:
            _logger.warning(
                "RFQ-quoted email template not found (medical_marketplace."
                "email_template_rfq_quoted) — skipping notification for %s",
                self.name,
            )
            return
        if not self.partner_id.email:
            _logger.warning(
                "Partner %s has no email on file — skipping RFQ notification for %s",
                self.partner_id.name, self.name,
            )
            return
        template.sudo().send_mail(self.id, force_send=True)
        _logger.info("Sent RFQ-quoted notification for %s to %s", self.name, self.partner_id.email)