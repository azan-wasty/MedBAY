import logging

from odoo import _, api, fields, models  # type: ignore
from odoo.exceptions import UserError  # type: ignore

_logger = logging.getLogger(__name__)


class MedicalReturnRequest(models.Model):
    """Customer-facing return cycle for delivered B2B orders.

    State machine:
        draft → requested → approved → refunded/replaced → done
                          ↘ rejected
    Any pre-done state can be cancelled.

    Inventory movement on approval and refunds on completion are both generated
    through Odoo's own built-in mechanisms (stock.return.picking wizard and
    account.move credit notes) — nothing here reimplements stock or accounting
    logic from scratch.
    """
    _name = 'medical.return.request'
    _description = 'Product Return Request'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'

    name = fields.Char(default='New', readonly=True, copy=False)
    sale_order_id = fields.Many2one(
        'sale.order', string='Original Order', required=True,
        tracking=True, index=True, ondelete='restrict',
    )
    partner_id = fields.Many2one(
        'res.partner', string='Customer Company',
        related='sale_order_id.partner_id', store=True, readonly=True,
    )
    company_id = fields.Many2one(
        'res.company', related='sale_order_id.company_id', store=True, readonly=True,
    )
    order_line_id = fields.Many2one(
        'sale.order.line', string='Order Line',
        domain="[('order_id', '=', sale_order_id)]",
        help='The specific order line being returned.',
    )
    product_id = fields.Many2one(
        'product.product', string='Product', required=True, tracking=True,
    )
    quantity = fields.Float(string='Quantity to Return', required=True, default=1.0)
    return_type = fields.Selection(
        [('refund', 'Refund'), ('replacement', 'Replacement')],
        string='Requested Resolution', required=True, default='refund', tracking=True,
    )

    # --- Reason (Feature 1: dropdown from medical.return.reason, not free text) ---
    reason_category_id = fields.Many2one(
        'medical.return.reason', string='Return Reason', required=True, tracking=True,
        help='Select the category that best describes why the product is being returned.',
    )
    reason_detail = fields.Text(
        string='Additional Details',
        help='Optional elaboration on the selected reason.',
    )

    admin_notes = fields.Text(string='Internal Notes')
    request_date = fields.Datetime(default=fields.Datetime.now, readonly=True)

    state = fields.Selection(
        [
            ('draft', 'Draft'),
            ('requested', 'Under Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('refunded', 'Refunded'),
            ('replaced', 'Replaced'),
            ('done', 'Done'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft', tracking=True, index=True,
    )

    delivery_picking_id = fields.Many2one(
        'stock.picking', string='Original Delivery', copy=False,
        help='The done outgoing picking this return is taken against.',
    )
    return_picking_id = fields.Many2one(
        'stock.picking', string='Return Picking', copy=False, readonly=True,
        help='Incoming picking generated via the standard stock.return.picking wizard.',
    )
    refund_move_id = fields.Many2one(
        'account.move', string='Credit Note', copy=False, readonly=True,
    )

    @api.constrains('product_id', 'sale_order_id', 'quantity')
    def _check_return_quantity_and_product(self):
        for rec in self:
            # Only validate if not draft/cancelled
            if rec.state in ('draft', 'cancelled'):
                continue
            # 1. Ensure product is in order lines
            lines = rec.sale_order_id.order_line.filtered(lambda l: l.product_id == rec.product_id)
            if not lines:
                raise UserError(_("The selected product '%s' is not part of this sale order.") % rec.product_id.display_name)
            
            # 2. Ensure quantity does not exceed delivered quantity
            total_delivered = sum(lines.mapped('qty_delivered'))
            if rec.quantity > total_delivered:
                raise UserError(_(
                    "Requested return quantity (%.2f) exceeds the total delivered quantity (%.2f) for this product."
                ) % (rec.quantity, total_delivered))

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code(
                    'medical.return.request') or 'New'
        return super().create(vals_list)

    # ------------------------------------------------------------------
    # State machine
    # ------------------------------------------------------------------
    def action_submit(self):
        """Customer submits a draft return for admin review."""
        for rec in self:
            if rec.state != 'draft':
                raise UserError(_('Only draft return requests can be submitted.'))
            if rec.quantity <= 0:
                raise UserError(_('Return quantity must be greater than zero.'))
        self.write({'state': 'requested'})

    def action_reject(self):
        for rec in self:
            if rec.state != 'requested':
                raise UserError(_('Only requested returns can be rejected.'))
        self.write({'state': 'rejected'})

    def action_cancel(self):
        for rec in self:
            if rec.state in ('done', 'cancelled'):
                raise UserError(_('This return is already finalized.'))
        self.write({'state': 'cancelled'})

    def action_approve(self):
        """Admin approves the return and creates the physical incoming return picking."""
        for rec in self:
            if rec.state != 'requested':
                raise UserError(_('Only requested returns can be approved.'))
            picking = rec.delivery_picking_id or rec._find_delivery_picking()
            if not picking:
                raise UserError(_(
                    'No completed delivery for this order/product was found. '
                    'Set "Original Delivery" manually and try again.'))
            rec.delivery_picking_id = picking
            rec._create_return_picking(picking)
        self.write({'state': 'approved'})

    def _find_delivery_picking(self):
        self.ensure_one()
        pickings = self.sale_order_id.picking_ids.filtered(
            lambda p: p.state == 'done' and p.picking_type_id.code == 'outgoing'
            and self.product_id in p.move_ids.product_id
        )
        return pickings[:1]

    def _create_return_picking(self, picking):
        """Wrap stock.return.picking wizard, scoping quantities to this return's product/qty."""
        self.ensure_one()
        wizard = self.env['stock.return.picking'].with_context(
            active_id=picking.id, active_model='stock.picking',
        ).create({})
        for line in wizard.product_return_moves:
            if line.product_id == self.product_id:
                line.quantity = self.quantity
            else:
                line.quantity = 0.0
        result = wizard._create_returns()
        return_picking = self.env['stock.picking'].browse(result.get('res_id'))
        if not return_picking:
            raise UserError(_('Failed to create the return picking.'))
        return_picking.action_confirm()
        return_picking.action_assign()
        return_picking.button_validate()
        self.return_picking_id = return_picking

    def action_process_refund(self):
        """Complete the cycle: issue a credit note or mark as replacement."""
        for rec in self:
            if rec.state != 'approved':
                raise UserError(_('Only approved returns can be finalized.'))
            if rec.return_type == 'refund':
                rec._create_credit_note()
                rec.state = 'refunded'
            else:
                rec.state = 'replaced'

    def _create_credit_note(self):
        self.ensure_one()
        order = self.sale_order_id
        invoice = order.invoice_ids.filtered(
            lambda m: m.state == 'posted' and m.move_type == 'out_invoice')[:1]
        price_unit = self.product_id.list_price
        if self.order_line_id:
            price_unit = self.order_line_id.price_unit
        elif invoice:
            inv_line = invoice.invoice_line_ids.filtered(
                lambda l: l.product_id == self.product_id)[:1]
            if inv_line:
                price_unit = inv_line.price_unit

        reason_label = self.reason_category_id.name if self.reason_category_id else self.product_id.display_name
        credit_note = self.env['account.move'].create({
            'move_type': 'out_refund',
            'partner_id': self.partner_id.id,
            'invoice_origin': order.name,
            'company_id': self.company_id.id,
            'reversed_entry_id': invoice.id if invoice else False,
            'invoice_line_ids': [(0, 0, {
                'product_id': self.product_id.id,
                'quantity': self.quantity,
                'price_unit': price_unit,
                'name': _('Return: %s', reason_label),
            })],
        })
        self.refund_move_id = credit_note
        _logger.info('Created credit note %s for return %s', credit_note.name, self.name)

    def action_mark_done(self):
        for rec in self:
            if rec.state not in ('refunded', 'replaced'):
                raise UserError(_('Only refunded or replaced returns can be closed out.'))
        self.write({'state': 'done'})
