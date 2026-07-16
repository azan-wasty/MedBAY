from odoo import models, fields

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    certification_info = fields.Text(string='Certification & Compliance')
    unit_of_measure = fields.Char(string='Unit of Measure')
    min_order_qty = fields.Integer(string='Minimum Order Quantity', default=1)
    warranty_period = fields.Char(string='Warranty Period')
