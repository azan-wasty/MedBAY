from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    certification_info = fields.Text(string='Certification & Compliance')
    unit_of_measure = fields.Char(string='Unit of Measure')
    min_order_qty = fields.Integer(string='Minimum Order Quantity', default=1)
    warranty_period = fields.Char(string='Warranty Period')

    # ------------------------------------------------------------------
    # B2B company linkage
    # ------------------------------------------------------------------
    # `seller_ids` (product.supplierinfo) already ships with the base
    # `product` module and is the correct built-in place to price/link a
    # product against one or more vendor companies (no `purchase` module
    # required). `vendor_id` below is just a "primary supplier" shortcut
    # on top of that for the marketplace UI/API, defaulting to the first
    # seller line.
    vendor_id = fields.Many2one(
        'res.partner',
        string='Primary Vendor Company',
        domain="[('is_company', '=', True)]",
        compute='_compute_vendor_id', store=True, readonly=False,
        help='The verified B2B company that supplies this product. '
             'Falls back to the first vendor pricelist entry (seller_ids).',
    )

    @api.depends('seller_ids', 'seller_ids.partner_id')
    def _compute_vendor_id(self):
        for product in self:
            if not product.vendor_id and product.seller_ids:
                product.vendor_id = product.seller_ids[0].partner_id

    # ------------------------------------------------------------------
    # Stock status
    # ------------------------------------------------------------------
    # Built entirely on top of `stock`'s own qty_available/type fields —
    # no separate inventory bookkeeping of our own. `type == 'product'`
    # is Odoo 17's "Storable Product" value; non-storable (service/consu)
    # products are always considered untracked rather than "out of stock".
    low_stock_threshold = fields.Integer(
        string='Low Stock Threshold', default=10,
        help='When on-hand quantity for a storable product falls at or '
             'below this number (but is still > 0), it is flagged as low stock.',
    )
    stock_status = fields.Selection(
        [
            ('in_stock', 'In Stock'),
            ('low_stock', 'Low Stock'),
            ('out_of_stock', 'Out of Stock'),
            ('not_tracked', 'Not Tracked'),
        ],
        string='Stock Status', compute='_compute_stock_status', store=True,
    )

    @api.depends('type', 'qty_available', 'low_stock_threshold')
    def _compute_stock_status(self):
        for product in self:
            if product.type != 'product':
                product.stock_status = 'not_tracked'
            elif product.qty_available <= 0:
                product.stock_status = 'out_of_stock'
            elif product.qty_available <= product.low_stock_threshold:
                product.stock_status = 'low_stock'
            else:
                product.stock_status = 'in_stock'
