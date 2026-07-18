from odoo import fields, models  # type: ignore


class MedicalReturnReason(models.Model):
    """Configurable list of return reason categories.

    Values are seeded in data/return_reasons.xml (noupdate=1) so they survive
    module upgrades while remaining fully editable by admins in the Odoo backend.
    """
    _name = 'medical.return.reason'
    _description = 'Return Reason Category'
    _order = 'sequence, name'

    name = fields.Char(string='Reason', required=True, translate=True)
    active = fields.Boolean(default=True)
    sequence = fields.Integer(default=10)
