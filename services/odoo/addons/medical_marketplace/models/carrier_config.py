from odoo import fields, models  # type: ignore


class MedicalCarrier(models.Model):
    """Shipping carrier registry with per-carrier tracking URL templates.

    Add new carriers by appending <record> blocks to data/carrier_config.xml
    and running 'Upgrade' on the medical_marketplace module — no code changes required.

    The tracking_url_template field uses a '{tracking_id}' placeholder that is
    substituted at runtime with the actual tracking reference on the sale order.
    Example: https://www.dhl.com/en/express/tracking.html?AWB={tracking_id}
    """
    _name = 'medical.carrier'
    _description = 'Shipping Carrier'
    _order = 'sequence, name'

    name = fields.Char(string='Carrier Name', required=True)
    tracking_url_template = fields.Char(
        string='Tracking URL Template',
        help='URL with a {tracking_id} placeholder that is substituted at runtime.\n'
             'Example: https://www.dhl.com/en/express/tracking.html?AWB={tracking_id}',
    )
    active = fields.Boolean(default=True)
    sequence = fields.Integer(default=10)
