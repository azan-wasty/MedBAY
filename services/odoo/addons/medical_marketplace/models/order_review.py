import logging

from odoo import _, api, fields, models  # type: ignore
from odoo.exceptions import ValidationError  # type: ignore

_logger = logging.getLogger(__name__)


class MedicalOrderReview(models.Model):
    """One-time-ever review per sale order (from the buyer company).

    Business rules enforced here:
    - A buyer can leave exactly ONE review per order (DB-level unique constraint).
    - Reviews are only accepted once the order has been fully invoiced/completed
      (enforced in the controller at submission time, not here, since 'completed'
       is a computed buyer-facing stage rather than a native Odoo model field).
    - Once submitted, the review is permanent.  Deleting the review record does NOT
      allow re-submission; the parent sale.order.has_been_reviewed flag is set to
      True on creation and is never cleared, even after a delete.

    Admin can delete reviews from the Odoo backend if needed.
    """
    _name = 'medical.order.review'
    _description = 'Order Review'
    _order = 'create_date desc'

    sale_order_id = fields.Many2one(
        'sale.order', string='Order', required=True,
        ondelete='cascade', index=True,
    )
    partner_id = fields.Many2one(
        'res.partner', string='Reviewer Company',
        related='sale_order_id.partner_id', store=True, readonly=True,
    )
    rating = fields.Integer(
        string='Rating (1–5)', default=5,
        help='Star rating from 1 (worst) to 5 (best).',
    )
    review_text = fields.Text(string='Review')

    _sql_constraints = [
        (
            'unique_review_per_order',
            'unique(sale_order_id)',
            'Only one review is allowed per order.',
        ),
    ]

    @api.constrains('rating')
    def _check_rating(self):
        for rec in self:
            if not (1 <= rec.rating <= 5):
                raise ValidationError(_('Rating must be between 1 and 5.'))

    @api.model_create_multi
    def create(self, vals_list):
        """Permanently mark the parent order as reviewed on first submission."""
        records = super().create(vals_list)
        for rec in records:
            # Stamp the flag on the order so it persists even if the review record
            # is later deleted — ensuring the one-time-ever policy holds.
            rec.sale_order_id.sudo().write({'has_been_reviewed': True})
            _logger.info(
                'Review %d created for order %s by partner %s',
                rec.id, rec.sale_order_id.name, rec.partner_id.name,
            )
        return records
