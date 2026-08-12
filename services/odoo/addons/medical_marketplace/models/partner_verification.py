import logging

from odoo import _, api, fields, models  # type: ignore
from odoo.exceptions import AccessError  # type: ignore

_logger = logging.getLogger(__name__)


class ResPartnerVerification(models.Model):
    """Adds company-verification fields to res.partner.

    NOTE: this is a separate extension file from your existing
    medical_partner.py on purpose, to avoid clobbering whatever fields
    (e.g. registration_number) you already defined there. Odoo supports
    multiple _inherit files against the same model — just make sure none
    of the field names below already exist in medical_partner.py.
    """
    _inherit = 'res.partner'

    verification_status = fields.Selection(
        [
            ('pending', 'Pending Review'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        string='Verification Status',
        default='pending',
        index=True,
        help='Only companies with status=verified may submit RFQs.',
    )
    verified_by = fields.Many2one('res.users', string='Verified By', readonly=True)
    verification_date = fields.Datetime(string='Verification Date', readonly=True)
    verification_notes = fields.Text(string='Verification / Rejection Notes')

    @api.model_create_multi
    def create(self, vals_list):
        is_admin = self.env.user.has_group('medical_marketplace.group_marketplace_admin') or self.env.user.id == 1
        for vals in vals_list:
            # Non-admins/portal users can never register a verified profile
            if not is_admin:
                vals['verification_status'] = 'pending'
                vals['is_verified'] = False
            else:
                if 'is_verified' in vals and 'verification_status' not in vals:
                    vals['verification_status'] = 'verified' if vals['is_verified'] else 'pending'
                elif 'verification_status' in vals and 'is_verified' not in vals:
                    vals['is_verified'] = vals['verification_status'] == 'verified'
        return super(ResPartnerVerification, self).create(vals_list)

    def write(self, vals):
        is_admin = self.env.user.has_group('medical_marketplace.group_marketplace_admin') or self.env.user.id == 1
        if not is_admin:
            if 'verification_status' in vals or 'is_verified' in vals:
                raise AccessError(_("Only marketplace administrators can change the company verification status."))

        if 'is_verified' in vals and 'verification_status' not in vals:
            vals['verification_status'] = 'verified' if vals['is_verified'] else 'pending'
        elif 'verification_status' in vals and 'is_verified' not in vals:
            vals['is_verified'] = vals['verification_status'] == 'verified'

        # Capture which partners are transitioning INTO 'verified' before write.
        newly_verified = self.env['res.partner']
        if vals.get('verification_status') == 'verified':
            newly_verified = self.filtered(lambda p: p.verification_status != 'verified')

        res = super(ResPartnerVerification, self).write(vals)

        # Cascade verification status changes from parent company to all child contact partners
        if 'verification_status' in vals or 'is_verified' in vals:
            cascade_vals = {}
            if 'verification_status' in vals:
                cascade_vals['verification_status'] = vals['verification_status']
            if 'is_verified' in vals:
                cascade_vals['is_verified'] = vals['is_verified']
            if 'verified_by' in vals:
                cascade_vals['verified_by'] = vals['verified_by']
            if 'verification_date' in vals:
                cascade_vals['verification_date'] = vals['verification_date']

            for partner in self:
                if partner.is_company and partner.child_ids:
                    children_to_update = partner.child_ids.filtered(
                        lambda c: c.verification_status != vals.get('verification_status')
                    )
                    if children_to_update:
                        children_to_update.sudo().with_context(tracking_disable=True).write(cascade_vals)

        # Send approval email to each newly-verified company partner.
        if newly_verified:
            template = self.env.ref(
                'medical_marketplace.email_template_partner_verified',
                raise_if_not_found=False,
            )
            if not template:
                _logger.warning(
                    "Verification approval template not found "
                    "(medical_marketplace.email_template_partner_verified) — skipping notifications."
                )
            else:
                for partner in newly_verified:
                    if partner.email:
                        try:
                            template.sudo().send_mail(partner.id, force_send=False)
                            _logger.info(
                                "Queued verification approval email for partner %s (%s)",
                                partner.name, partner.email,
                            )
                        except Exception as e:
                            _logger.warning(
                                "Skipped verification email for partner %s (SMTP not configured): %s",
                                partner.name, str(e),
                            )
                    else:
                        _logger.warning(
                            "Partner %s has no email — skipping verification notification.",
                            partner.name,
                        )

        return res