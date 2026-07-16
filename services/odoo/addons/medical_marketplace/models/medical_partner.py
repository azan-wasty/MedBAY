from odoo import models, fields

class ResPartner(models.Model):
    _inherit = 'res.partner'

    registration_number = fields.Char(string='Registration/License Number')
    is_verified = fields.Boolean(string='Verified Status', default=False)
