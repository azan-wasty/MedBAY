from odoo import _, fields, models  # type: ignore


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

    from odoo import api
    from odoo.exceptions import AccessError

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
        return super(ResPartnerVerification, self).write(vals)