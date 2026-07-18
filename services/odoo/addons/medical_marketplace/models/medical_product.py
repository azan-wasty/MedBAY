from odoo import _, api, fields, models  # type: ignore
from odoo.exceptions import ValidationError  # type: ignore


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    certification_info = fields.Text(string='Certification & Compliance')
    unit_of_measure = fields.Char(string='Unit of Measure')
    min_order_qty = fields.Integer(string='Minimum Order Quantity', default=1)
    warranty_period = fields.Char(string='Warranty Period')

    # ------------------------------------------------------------------
    # B2B company linkage
    # ------------------------------------------------------------------
    has_vendor_company = fields.Boolean(
        string='Has Vendor Company',
        default=False,
        help='Check to assign a specific vendor company to this product.'
    )
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

    @api.onchange('has_vendor_company')
    def _onchange_has_vendor_company(self):
        if not self.has_vendor_company:
            self.vendor_id = False
            self.seller_ids = [(5, 0, 0)]

    # ------------------------------------------------------------------
    # Marketplace publish/unpublish (Feature 4)
    # ------------------------------------------------------------------
    marketplace_published = fields.Boolean(
        string='Published on Marketplace',
        default=False,
        index=True,
        help='Only published products appear on the buyer-facing storefront. '
             'Unpublishing hides the product from all frontend listings and direct links '
             'without deleting it or affecting stock.',
    )

    # ------------------------------------------------------------------
    # Stock status (existing — do not change field names)
    # ------------------------------------------------------------------
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
