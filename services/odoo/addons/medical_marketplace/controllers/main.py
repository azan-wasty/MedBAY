import base64
import json
import logging
import os

from odoo import fields, http  # type: ignore
from odoo.http import request  # type: ignore

_logger = logging.getLogger(__name__)

ODOO_DB_NAME = os.environ.get('ODOO_DB_NAME', 'odoo')
ADMIN_GROUP_XMLID = 'medical_marketplace.group_marketplace_admin'

# Comma-separated list of origins allowed to make credentialed cross-origin
# requests to the /api/* endpoints, e.g. "http://localhost:3000,https://medbay.example.com".
# Reflecting an arbitrary request Origin here (with Allow-Credentials: true)
# would let any website ride a logged-in user's session cookie, so we only
# ever echo back an Origin that's explicitly on this list.
_ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get('MARKETPLACE_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    if origin.strip()
}


def _allowed_origin(request_origin):
    """Return request_origin if it's on the allow-list, else None."""
    if request_origin and request_origin in _ALLOWED_ORIGINS:
        return request_origin
    return None


class MedicalMarketplaceController(http.Controller):

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _json_response(self, data, status=200):
        def _decode_bytes(val):
            if isinstance(val, dict):
                return {k: _decode_bytes(v) for k, v in val.items()}
            elif isinstance(val, list):
                return [_decode_bytes(v) for v in val]
            elif isinstance(val, bytes):
                return val.decode('utf-8')
            return val

        origin = _allowed_origin(request.httprequest.headers.get('Origin'))
        headers = [
            ('Content-Type', 'application/json'),
            ('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie'),
        ]
        if origin:
            headers.append(('Access-Control-Allow-Origin', origin))
            headers.append(('Access-Control-Allow-Credentials', 'true'))
        return request.make_response(
            json.dumps(_decode_bytes(data), default=str),
            headers=headers,
            status=status
        )

    def _is_admin(self):
        return bool(request.env.user) and request.env.user.has_group(ADMIN_GROUP_XMLID)

    def _require_admin(self):
        """Returns a 403 response if the current user isn't a marketplace admin."""
        if not self._is_admin():
            return self._json_response({'error': 'Forbidden: admin access required'}, status=403)
        return None

    def _get_config_param(self, key, default=''):
        """Read a value from ir.config_parameter at runtime (never hardcoded)."""
        return request.env['ir.config_parameter'].sudo().get_param(key, default)

    def _get_order_stages(self):
        """Load buyer-facing stage definitions from ir.config_parameter."""
        raw = self._get_config_param('medical_marketplace.order_stages', '[]')
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return []

    def _compute_buyer_stage(self, order):
        """Map Odoo internal order/picking/invoice states to a buyer-facing stage key.

        Stage keys are defined in data/config_params.xml and must match the 'key'
        values in the medical_marketplace.order_stages config parameter.
        """
        # Active return request → branch stage
        has_active_return = request.env['medical.return.request'].sudo().search(
            [('sale_order_id', '=', order.id), ('state', 'in', ('requested', 'approved'))],
            limit=1,
        )
        if has_active_return:
            return 'return_requested'

        if order.state in ('draft', 'sent'):
            return 'ordered'
        if order.state == 'cancel':
            return 'cancelled'

        if order.state in ('sale', 'done'):
            outgoing = order.picking_ids.filtered(
                lambda p: p.picking_type_id.code == 'outgoing'
            )
            if outgoing and all(p.state == 'done' for p in outgoing):
                # All outgoing pickings done — check if invoice is paid
                invoices = order.invoice_ids.filtered(lambda i: i.state == 'posted')
                if any(i.payment_state in ('paid', 'in_payment') for i in invoices):
                    return 'completed'
                return 'delivered'
            if outgoing and any(p.state in ('confirmed', 'assigned') for p in outgoing):
                return 'out_for_delivery'
            return 'processing'

        return 'ordered'

    # ------------------------------------------------------------------
    # CORS preflight
    # ------------------------------------------------------------------

    @http.route('/api/<path:subpath>', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    def api_options(self, **kwargs):
        origin = _allowed_origin(request.httprequest.headers.get('Origin'))
        headers = [
            ('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie'),
        ]
        if origin:
            headers.append(('Access-Control-Allow-Origin', origin))
            headers.append(('Access-Control-Allow-Credentials', 'true'))
        return request.make_response('', headers=headers)

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def _serialize_attribute_lines(self, product_tmpl):
        lines = []
        for line in product_tmpl.attribute_line_ids:
            lines.append({
                'attribute_id': line.attribute_id.id,
                'attribute_name': line.attribute_id.name,
                'display_type': line.attribute_id.display_type,
                'values': [
                    {
                        'id': value.id,
                        'name': value.name,
                        'html_color': value.html_color or False,
                    }
                    for value in line.value_ids
                ],
            })
        return lines

    def _serialize_variants(self, product_tmpl):
        variants = []
        for variant in product_tmpl.product_variant_ids:
            combination = [
                {
                    'attribute_id': ptav.attribute_id.id,
                    'attribute_name': ptav.attribute_id.name,
                    'value_id': ptav.product_attribute_value_id.id,
                    'value_name': ptav.product_attribute_value_id.name,
                }
                for ptav in variant.product_template_attribute_value_ids
            ]
            variants.append({
                'id': variant.id,
                'price': variant.lst_price,
                'qty_available': variant.qty_available,
                'active': variant.active,
                'combination': combination,
            })
        return variants

    @http.route('/api/products', type='http', auth='public', methods=['GET'], csrf=False)
    def list_products(self, **kwargs):
        # Feature 4: only marketplace_published products are visible to buyers
        domain = [('sale_ok', '=', True), ('marketplace_published', '=', True)]
        search_term = kwargs.get('search')
        if search_term:
            domain.append(('name', 'ilike', search_term))

        products = request.env['product.template'].sudo().search_read(
            domain,
            ['id', 'name', 'list_price', 'description_sale', 'categ_id',
             'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period',
             'image_256', 'has_vendor_company', 'vendor_id', 'stock_status', 'low_stock_threshold',
             'attribute_line_ids', 'marketplace_published']
        )
        return self._json_response(products)

    @http.route('/api/products/<int:product_id>', type='http', auth='public', methods=['GET'], csrf=False)
    def product_detail(self, product_id, **kwargs):
        product_tmpl = request.env['product.template'].sudo().browse(product_id)
        if not product_tmpl.exists() or not product_tmpl.marketplace_published:
            return self._json_response({'error': 'Product not found'}, status=404)

        data = product_tmpl.read([
            'id', 'name', 'list_price', 'description_sale', 'categ_id',
            'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period',
            'image_1920', 'has_vendor_company', 'vendor_id', 'stock_status', 'low_stock_threshold',
            'qty_available', 'marketplace_published',
        ])[0]
        data['attribute_lines'] = self._serialize_attribute_lines(product_tmpl)
        data['variants'] = self._serialize_variants(product_tmpl)
        return self._json_response(data)

    @http.route('/api/products/<int:product_id>/pricing', type='http', auth='public', methods=['GET'], csrf=False)
    def product_pricing(self, product_id, **kwargs):
        product_tmpl = request.env['product.template'].sudo().browse(product_id)
        if not product_tmpl.exists() or not product_tmpl.marketplace_published:
            return self._json_response({'error': 'Product not found'}, status=404)

        pricelist_id = kwargs.get('pricelist_id')
        if pricelist_id:
            pricelist = request.env['product.pricelist'].sudo().browse(int(pricelist_id))
        else:
            pricelist = request.env['product.pricelist'].sudo().search([], limit=1)

        base_price = product_tmpl.list_price
        breaks = [{'min_qty': 1, 'price': base_price, 'discount_pct': 0.0}]

        if pricelist.exists():
            items = request.env['product.pricelist.item'].sudo().search(
                [
                    ('pricelist_id', '=', pricelist.id),
                    '|',
                        ('product_tmpl_id', '=', product_tmpl.id),
                        ('product_tmpl_id', '=', False),
                ],
                order='min_quantity asc',
            )
            for item in items:
                if item.applied_on == '1_product' and item.product_tmpl_id.id != product_tmpl.id:
                    continue
                if item.applied_on == '2_product_category' and item.categ_id and item.categ_id != product_tmpl.categ_id:
                    continue

                if item.compute_price == 'fixed':
                    price = item.fixed_price
                elif item.compute_price == 'percentage':
                    price = base_price * (1 - (item.percent_price or 0) / 100.0)
                elif item.compute_price == 'formula':
                    price = base_price * (1 - (item.price_discount or 0) / 100.0) + (item.price_surcharge or 0)
                else:
                    price = base_price

                discount_pct = round((1 - price / base_price) * 100, 2) if base_price else 0.0
                breaks.append({
                    'min_qty': item.min_quantity or 1,
                    'price': round(price, 2),
                    'discount_pct': discount_pct,
                })

        breaks.sort(key=lambda b: b['min_qty'])
        seen_qty = set()
        deduped = []
        for b in breaks:
            if b['min_qty'] in seen_qty:
                continue
            seen_qty.add(b['min_qty'])
            deduped.append(b)

        return self._json_response({
            'product_id': product_id,
            'base_price': base_price,
            'currency': product_tmpl.currency_id.name if product_tmpl.currency_id else None,
            'price_breaks': deduped,
        })

    # ------------------------------------------------------------------
    # Admin: product publish / unpublish (Feature 4)
    # ------------------------------------------------------------------

    @http.route('/api/admin/products/<int:product_id>/publish', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_publish_product(self, product_id, **kwargs):
        if resp := self._require_admin():
            return resp
        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists():
            return self._json_response({'error': 'Product not found'}, status=404)
        product.write({'marketplace_published': True})
        return self._json_response({'success': True, 'marketplace_published': True})

    @http.route('/api/admin/products/<int:product_id>/unpublish', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_unpublish_product(self, product_id, **kwargs):
        if resp := self._require_admin():
            return resp
        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists():
            return self._json_response({'error': 'Product not found'}, status=404)
        product.write({'marketplace_published': False})
        return self._json_response({'success': True, 'marketplace_published': False})

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    @http.route('/api/auth/register', type='http', auth='public', methods=['POST'], csrf=False)
    def register(self, **kwargs):
        try:
            body = json.loads(request.httprequest.data)
            name = body.get('name')
            registration_number = body.get('registration_number')
            email = body.get('email')
            password = body.get('password')

            if not all([name, email, password]):
                return self._json_response({'error': 'Missing required fields'}, status=400)

            existing_user = request.env['res.users'].sudo().search([('login', '=', email)])
            if existing_user:
                return self._json_response({'error': 'Email already registered'}, status=400)

            company = request.env['res.partner'].sudo().create({
                'name': name,
                'is_company': True,
                'registration_number': registration_number,
                'email': email,
            })

            user = request.env['res.users'].sudo().create({
                'name': name,
                'login': email,
                'password': password,
                'partner_id': company.id,
                'groups_id': [(6, 0, [request.env.ref('base.group_portal').id])]
            })

            return self._json_response({
                'success': True,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.login
                }
            })
        except Exception as e:
            _logger.exception("Register failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/auth/login', type='http', auth='none', methods=['POST'], csrf=False)
    def login(self, **kwargs):
        try:
            body = json.loads(request.httprequest.data)
            login_val = body.get('login')
            password = body.get('password')

            if not login_val or not password:
                return self._json_response({'error': 'Missing login or password'}, status=400)

            uid = request.session.authenticate(ODOO_DB_NAME, login_val, password)

            if not uid:
                return self._json_response({'error': 'Invalid credentials'}, status=401)

            user = request.env['res.users'].sudo().browse(uid)
            return self._json_response({
                'success': True,
                'session_id': request.session.sid,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.login,
                    'partner_id': user.partner_id.id,
                    'is_admin': user.has_group(ADMIN_GROUP_XMLID),
                    'verification_status': user.partner_id.verification_status,
                }
            })

        except Exception as e:
            _logger.exception("Login failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/auth/whoami', type='http', auth='user', methods=['GET'], csrf=False)
    def whoami(self, **kwargs):
        user = request.env.user
        return self._json_response({
            'sid': request.session.sid,
            'uid': request.session.uid,
            'db': request.session.db,
            'login': user.login,
            'is_admin': user.has_group(ADMIN_GROUP_XMLID),
            'verification_status': user.partner_id.verification_status,
        })

    # ------------------------------------------------------------------
    # RFQ (buyer-facing)
    # ------------------------------------------------------------------

    @http.route('/api/rfq', type='http', auth='user', methods=['POST'], csrf=False)
    def create_rfq(self, **kwargs):
        try:
            user = request.env.user
            partner = user.partner_id

            require_verification = self._get_config_param(
                'medical_marketplace.require_verification_for_rfq', 'True'
            ) == 'True'
            if require_verification and partner.verification_status != 'verified':
                return self._json_response(
                    {'error': 'Your company must be verified before submitting RFQs.',
                     'verification_status': partner.verification_status},
                    status=403
                )

            body = json.loads(request.httprequest.data)
            items = body.get('items', [])
            notes = str(body.get('notes', body.get('buyer_notes', ''))).strip()

            if not items:
                return self._json_response({'error': 'No items specified'}, status=400)

            sale_order = request.env['sale.order'].sudo().create({
                'partner_id': partner.id,
                'buyer_notes': notes or False,
            })

            for item in items:
                product_template = request.env['product.template'].sudo().browse(
                    item.get('product_id')
                )
                if not product_template.exists():
                    continue

                variant = None
                variant_id = item.get('variant_id')
                if variant_id:
                    candidate = request.env['product.product'].sudo().browse(int(variant_id))
                    if candidate.exists() and candidate.product_tmpl_id.id == product_template.id:
                        variant = candidate

                if not variant:
                    variant = product_template.product_variant_id

                target_price = float(item.get('target_price', item.get('target_price_unit', 0.0)))

                request.env['sale.order.line'].sudo().create({
                    'order_id': sale_order.id,
                    'product_id': variant.id,
                    'product_uom_qty': item.get('quantity', 1),
                    'target_price_unit': target_price if target_price > 0 else False,
                })

            return self._json_response({
                'success': True,
                'rfq_id': sale_order.id,
                'name': sale_order.name,
                'state': sale_order.state,
            })

        except Exception as e:
            _logger.exception("RFQ create failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/rfq/status', type='http', auth='user', methods=['GET'], csrf=False)
    def rfq_status(self, **kwargs):
        try:
            user = request.env.user
            partner_id = user.partner_id.id

            orders = request.env['sale.order'].sudo().search_read(
                [('partner_id', '=', partner_id)],
                ['id', 'name', 'date_order', 'amount_total', 'state', 'invoice_status']
            )

            return self._json_response(orders)

        except Exception as e:
            _logger.exception("RFQ status fetch failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/orders/<int:order_id>/tracking', type='http', auth='user', methods=['GET'], csrf=False)
    def order_tracking(self, order_id, **kwargs):
        """Order tracking endpoint with buyer-facing stage, carrier info, and review data."""
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            # IDOR guard: portal users can only see their own company's orders
            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            pickings = order.picking_ids.sudo().read(
                ['id', 'name', 'state', 'scheduled_date', 'date_done']
            )
            invoices = order.invoice_ids.sudo().read(
                ['id', 'name', 'state', 'payment_state', 'amount_total', 'invoice_date']
            )

            # Carrier & tracking info
            carrier_info = False
            if order.carrier_id:
                carrier_info = {
                    'id': order.carrier_id.id,
                    'name': order.carrier_id.name,
                }

            # Buyer-facing stage (computed from real Odoo state)
            buyer_stage = self._compute_buyer_stage(order)
            stages = self._get_order_stages()

            # Review data
            review_record = order.review_ids[:1] if order.review_ids else False
            review_data = None
            if review_record:
                review_data = {
                    'id': review_record.id,
                    'rating': review_record.rating,
                    'review_text': review_record.review_text or '',
                    'create_date': review_record.create_date,
                }

            return self._json_response({
                'order_id': order.id,
                'name': order.name,
                'state': order.state,
                'invoice_status': order.invoice_status,
                'amount_total': order.amount_total,
                'date_order': order.date_order,
                'buyer_stage': buyer_stage,
                'stages': stages,
                'carrier': carrier_info,
                'tracking_reference': order.tracking_reference or False,
                'tracking_url': order.tracking_url or False,
                'has_been_reviewed': order.has_been_reviewed,
                'review': review_data,
                'pickings': pickings,
                'invoices': invoices,
            })
        except Exception as e:
            _logger.exception("Order tracking fetch failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/rfq/<int:order_id>', type='http', auth='user', methods=['GET'], csrf=False)
    def rfq_detail(self, order_id, **kwargs):
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            lines = []
            for line in order.order_line:
                variant = line.product_id
                lines.append({
                    'id': line.id,
                    'product_id': variant.id,
                    'product_template_id': variant.product_tmpl_id.id,
                    'product_name': variant.display_name,
                    'product_uom_qty': line.product_uom_qty,
                    'price_unit': line.price_unit,
                    'price_subtotal': line.price_subtotal,
                    'target_price_unit': line.target_price_unit or None,
                })

            return self._json_response({
                'id': order.id,
                'name': order.name,
                'state': order.state,
                'date_order': order.date_order,
                'amount_total': order.amount_total,
                'buyer_notes': order.buyer_notes or None,
                'lines': lines,
            })
        except Exception as e:
            _logger.exception("RFQ detail fetch failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/rfq/<int:order_id>/approve', type='http', auth='user', methods=['POST'], csrf=False)
    def approve_rfq(self, order_id, **kwargs):
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            if order.state != 'sent':
                return self._json_response({'error': 'Only quotations in "sent" state can be approved'}, status=400)

            order.action_confirm()

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'amount_total': order.amount_total,
            })
        except Exception as e:
            _logger.exception("RFQ approval failed")
            return self._json_response({'error': str(e)}, status=500)

    # ------------------------------------------------------------------
    # Order Reviews (Feature 5)
    # ------------------------------------------------------------------

    @http.route('/api/orders/<int:order_id>/review', type='http', auth='user', methods=['GET'], csrf=False)
    def get_order_review(self, order_id, **kwargs):
        """Return the calling buyer's review for this order (if any)."""
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            review = order.review_ids[:1] if order.review_ids else False
            return self._json_response({
                'has_been_reviewed': order.has_been_reviewed,
                'review': {
                    'id': review.id,
                    'rating': review.rating,
                    'review_text': review.review_text or '',
                    'create_date': review.create_date,
                } if review else None,
            })
        except Exception as e:
            _logger.exception("Review fetch failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/orders/<int:order_id>/review', type='http', auth='user', methods=['POST'], csrf=False)
    def create_order_review(self, order_id, **kwargs):
        """Submit a one-time-ever review for a completed order."""
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            # IDOR guard
            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            # One-time-ever enforcement (permanent flag, survives review deletion)
            if order.has_been_reviewed:
                return self._json_response(
                    {'error': 'You have already reviewed this order. Only one review is allowed per order.'},
                    status=400,
                )

            # Only allow reviews on completed orders
            buyer_stage = self._compute_buyer_stage(order)
            if buyer_stage != 'completed':
                return self._json_response(
                    {'error': 'Reviews can only be submitted for completed orders.'},
                    status=400,
                )

            body = json.loads(request.httprequest.data or b'{}')
            rating = int(body.get('rating', 5))
            review_text = str(body.get('review_text', '')).strip()

            if not (1 <= rating <= 5):
                return self._json_response({'error': 'Rating must be between 1 and 5.'}, status=400)

            review = request.env['medical.order.review'].sudo().create({
                'sale_order_id': order.id,
                'rating': rating,
                'review_text': review_text,
            })

            return self._json_response({
                'success': True,
                'review': {
                    'id': review.id,
                    'rating': review.rating,
                    'review_text': review.review_text or '',
                    'create_date': review.create_date,
                },
            })
        except Exception as e:
            _logger.exception("Review creation failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/reviews/<int:review_id>', type='http', auth='user', methods=['DELETE'], csrf=False)
    def delete_order_review(self, review_id, **kwargs):
        """Delete a review submitted by the calling user's company."""
        try:
            review = request.env['medical.order.review'].sudo().browse(review_id)
            user = request.env.user

            if not review.exists():
                return self._json_response({'error': 'Review not found'}, status=404)

            # IDOR guard: Only the company that wrote it can delete it
            if review.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Forbidden: You can only delete your own reviews'}, status=403)

            review.unlink()
            return self._json_response({'success': True})
        except Exception as e:
            _logger.exception("Review deletion failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/products/<int:product_id>/reviews', type='http', auth='public', methods=['GET'], csrf=False)
    def get_product_reviews(self, product_id, **kwargs):
        """Fetch all reviews for a product based on completed orders containing it."""
        try:
            # Find all sale order lines for this product template
            lines = request.env['sale.order.line'].sudo().search([('product_id.product_tmpl_id', '=', product_id)])
            order_ids = lines.mapped('order_id').ids

            if not order_ids:
                return self._json_response([])

            # Find all reviews for those orders
            reviews = request.env['medical.order.review'].sudo().search_read(
                [('sale_order_id', 'in', order_ids)],
                ['id', 'rating', 'review_text', 'create_date', 'partner_id'],
                order='create_date desc'
            )

            user = request.env.user if request.env.user else None
            partner_id = user.partner_id.id if user else None

            result = []
            for r in reviews:
                reviewer_name = r['partner_id'][1] if r.get('partner_id') else 'Anonymous'
                can_delete = bool(partner_id and r.get('partner_id') and r['partner_id'][0] == partner_id)
                result.append({
                    'id': r['id'],
                    'rating': r['rating'],
                    'review_text': r['review_text'] or '',
                    'create_date': r['create_date'],
                    'reviewer_name': reviewer_name,
                    'can_delete': can_delete
                })

            return self._json_response(result)
        except Exception as e:
            _logger.exception("Product reviews fetch failed")
            return self._json_response({'error': str(e)}, status=500)

    # ------------------------------------------------------------------
    # Admin: company verification
    # ------------------------------------------------------------------

    @http.route('/api/admin/companies', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_list_companies(self, **kwargs):
        if resp := self._require_admin():
            return resp

        domain = [('is_company', '=', True)]
        status_filter = kwargs.get('status')
        if status_filter:
            domain.append(('verification_status', '=', status_filter))

        companies = request.env['res.partner'].sudo().search_read(
            domain,
            ['id', 'name', 'email', 'registration_number', 'verification_status',
             'verification_date', 'create_date'],
            order='create_date desc',
        )
        return self._json_response(companies)

    @http.route('/api/admin/companies/<int:partner_id>/verify', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_verify_company(self, partner_id, **kwargs):
        if resp := self._require_admin():
            return resp

        partner = request.env['res.partner'].sudo().browse(partner_id)
        if not partner.exists():
            return self._json_response({'error': 'Company not found'}, status=404)

        partner.write({
            'verification_status': 'verified',
            'verified_by': request.env.user.id,
            'verification_date': fields.Datetime.now(),
        })
        return self._json_response({'success': True, 'verification_status': partner.verification_status})

    @http.route('/api/admin/companies/<int:partner_id>/reject', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_reject_company(self, partner_id, **kwargs):
        if resp := self._require_admin():
            return resp

        try:
            body = json.loads(request.httprequest.data or b'{}')
        except json.JSONDecodeError:
            body = {}

        partner = request.env['res.partner'].sudo().browse(partner_id)
        if not partner.exists():
            return self._json_response({'error': 'Company not found'}, status=404)

        partner.write({
            'verification_status': 'rejected',
            'verified_by': request.env.user.id,
            'verification_date': fields.Datetime.now(),
            'verification_notes': body.get('reason', ''),
        })
        return self._json_response({'success': True, 'verification_status': partner.verification_status})

    # ------------------------------------------------------------------
    # Admin: RFQ quoting
    # ------------------------------------------------------------------

    @http.route('/api/admin/rfq', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_list_rfqs(self, **kwargs):
        if resp := self._require_admin():
            return resp

        state_param = kwargs.get('state')
        if state_param:
            domain = [('state', '=', state_param)]
        else:
            domain = [('state', '=', 'draft')]
        orders = request.env['sale.order'].sudo().search_read(
            domain,
            ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'carrier_id', 'tracking_reference'],
            order='date_order desc',
        )
        return self._json_response(orders)

    @http.route('/api/admin/rfq/<int:order_id>', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_rfq_detail(self, order_id, **kwargs):
        if resp := self._require_admin():
            return resp

        order = request.env['sale.order'].sudo().browse(order_id)
        if not order.exists():
            return self._json_response({'error': 'RFQ not found'}, status=404)

        lines = []
        for line in order.order_line.sudo():
            lines.append({
                'id': line.id,
                'product_id': (line.product_id.id, line.product_id.display_name),
                'product_uom_qty': line.product_uom_qty,
                'price_unit': line.price_unit,
                'price_subtotal': line.price_subtotal,
                'target_price_unit': line.target_price_unit or None,
            })
        return self._json_response({
            'id': order.id,
            'name': order.name,
            'state': order.state,
            'partner_id': order.partner_id.id,
            'partner_name': order.partner_id.name,
            'amount_total': order.amount_total,
            'buyer_notes': order.buyer_notes or None,
            'lines': lines,
        })

    @http.route('/api/admin/rfq/<int:order_id>/quote', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_quote_rfq(self, order_id, **kwargs):
        """Set line prices and move RFQ from draft to sent (triggers email notification)."""
        if resp := self._require_admin():
            return resp

        try:
            body = json.loads(request.httprequest.data)
            order = request.env['sale.order'].sudo().browse(order_id)
            if not order.exists():
                return self._json_response({'error': 'RFQ not found'}, status=404)

            for line_update in body.get('lines', []):
                line = request.env['sale.order.line'].sudo().browse(line_update.get('line_id'))
                if line.exists() and line.order_id.id == order.id:
                    line.write({'price_unit': line_update.get('price_unit', line.price_unit)})

            order.write({'state': 'sent'})

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'amount_total': order.amount_total,
            })
        except Exception as e:
            _logger.exception("RFQ quoting failed")
            return self._json_response({'error': str(e)}, status=500)

    # ------------------------------------------------------------------
    # Admin: order tracking entry (Feature 3)
    # ------------------------------------------------------------------

    @http.route('/api/admin/orders/<int:order_id>/tracking', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_set_order_tracking(self, order_id, **kwargs):
        """Admin enters shipping carrier and tracking reference for a confirmed order."""
        if resp := self._require_admin():
            return resp

        try:
            body = json.loads(request.httprequest.data or b'{}')
            carrier_id = body.get('carrier_id')
            tracking_reference = str(body.get('tracking_reference', '')).strip()

            if not carrier_id:
                return self._json_response({'error': 'carrier_id is required'}, status=400)
            if not tracking_reference:
                return self._json_response({'error': 'tracking_reference is required'}, status=400)

            order = request.env['sale.order'].sudo().browse(int(order_id))
            if not order.exists():
                return self._json_response({'error': 'Order not found'}, status=404)

            carrier = request.env['medical.carrier'].sudo().browse(int(carrier_id))
            if not carrier.exists():
                return self._json_response({'error': 'Carrier not found'}, status=404)

            order.write({
                'carrier_id': carrier.id,
                'tracking_reference': tracking_reference,
            })

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'carrier': {'id': carrier.id, 'name': carrier.name},
                'tracking_reference': order.tracking_reference,
                'tracking_url': order.tracking_url or False,
            })
        except Exception as e:
            _logger.exception("Admin tracking entry failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/admin/carriers', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_list_carriers(self, **kwargs):
        """Return list of active shipping carriers for admin dropdowns."""
        if resp := self._require_admin():
            return resp
        carriers = request.env['medical.carrier'].sudo().search_read(
            [('active', '=', True)],
            ['id', 'name', 'tracking_url_template'],
            order='sequence, name',
        )
        return self._json_response(carriers)

    # ------------------------------------------------------------------
    # Admin: product image management
    # ------------------------------------------------------------------

    @http.route('/api/admin/products/<int:product_id>/image', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_upload_product_image(self, product_id, **kwargs):
        if resp := self._require_admin():
            return resp

        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists():
            return self._json_response({'error': 'Product not found'}, status=404)

        image_file = request.httprequest.files.get('image')
        if not image_file:
            return self._json_response({'error': 'No image file provided (expected multipart field "image")'}, status=400)

        raw = image_file.read()
        if len(raw) > 10 * 1024 * 1024:  # 10MB guard
            return self._json_response({'error': 'Image too large (max 10MB)'}, status=400)

        product.write({'image_1920': base64.b64encode(raw)})
        return self._json_response({'success': True, 'product_id': product.id})

    @http.route('/api/admin/products/<int:product_id>/image', type='http', auth='user', methods=['DELETE'], csrf=False)
    def admin_delete_product_image(self, product_id, **kwargs):
        if resp := self._require_admin():
            return resp

        product = request.env['product.template'].sudo().browse(product_id)
        if not product.exists():
            return self._json_response({'error': 'Product not found'}, status=404)

        product.write({'image_1920': False})
        return self._json_response({'success': True})

    # ------------------------------------------------------------------
    # Customer: return requests (Feature 1)
    # ------------------------------------------------------------------

    @http.route('/api/returns/reasons', type='http', auth='public', methods=['GET'], csrf=False)
    def list_return_reasons(self, **kwargs):
        """Return active return reason categories for the frontend dropdown.
        Loaded at runtime from medical.return.reason records — no hardcoded list.
        """
        reasons = request.env['medical.return.reason'].sudo().search_read(
            [('active', '=', True)],
            ['id', 'name'],
            order='sequence, name',
        )
        return self._json_response(reasons)

    @http.route('/api/returns', type='http', auth='user', methods=['POST'], csrf=False)
    def create_return_request(self, **kwargs):
        try:
            user = request.env.user
            order_id = int(kwargs.get('order_id', 0))
            product_id = int(kwargs.get('product_id', 0))
            quantity = float(kwargs.get('quantity', 0))
            return_type = kwargs.get('return_type', 'refund')
            reason_category_id = int(kwargs.get('reason_category_id', 0))
            reason_detail = kwargs.get('reason_detail', '').strip()

            # Validate all required fields
            if not order_id:
                return self._json_response({'error': 'order_id is required'}, status=400)
            if not product_id:
                return self._json_response({'error': 'product_id is required'}, status=400)
            if not reason_category_id:
                return self._json_response({'error': 'reason_category_id is required'}, status=400)
            if quantity <= 0:
                return self._json_response({'error': 'Quantity must be greater than zero'}, status=400)
            if return_type not in ('refund', 'replacement'):
                return self._json_response({'error': 'return_type must be "refund" or "replacement"'}, status=400)

            order = request.env['sale.order'].sudo().browse(order_id)
            # IDOR guard: verify this order belongs to the calling user's partner
            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            reason = request.env['medical.return.reason'].sudo().browse(reason_category_id)
            if not reason.exists():
                return self._json_response({'error': 'Invalid return reason'}, status=400)

            return_request = request.env['medical.return.request'].sudo().create({
                'sale_order_id': order.id,
                'product_id': product_id,
                'quantity': quantity,
                'return_type': return_type,
                'reason_category_id': reason_category_id,
                'reason_detail': reason_detail,
            })
            return_request.action_submit()

            # Confirmation message from config (not hardcoded)
            confirmation_msg = self._get_config_param(
                'medical_marketplace.return_confirmation_message',
                'Your return request has been received.'
            )

            return self._json_response({
                'success': True,
                'return_id': return_request.id,
                'name': return_request.name,
                'state': return_request.state,
                'confirmation_message': confirmation_msg,
            })
        except Exception as e:
            _logger.exception("Return request creation failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/returns', type='http', auth='user', methods=['GET'], csrf=False)
    def list_return_requests(self, **kwargs):
        user = request.env.user
        returns = request.env['medical.return.request'].sudo().search(
            [('partner_id', '=', user.partner_id.id)])
        return self._json_response({
            'returns': [{
                'id': r.id,
                'name': r.name,
                'sale_order_id': r.sale_order_id.id,
                'sale_order_name': r.sale_order_id.name,
                'product_id': r.product_id.id,
                'product_name': r.product_id.display_name,
                'quantity': r.quantity,
                'return_type': r.return_type,
                'reason_category': r.reason_category_id.name if r.reason_category_id else '',
                'reason_detail': r.reason_detail or '',
                'state': r.state,
                'request_date': r.request_date,
            } for r in returns]
        })

    # ------------------------------------------------------------------
    # Admin: return management (Feature 1 + Feature 6)
    # ------------------------------------------------------------------

    @http.route('/api/admin/returns', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_list_returns(self, **kwargs):
        """Admin view of all return requests with full context."""
        if resp := self._require_admin():
            return resp

        domain = []
        status_filter = kwargs.get('status')
        if status_filter:
            domain.append(('state', '=', status_filter))

        returns = request.env['medical.return.request'].sudo().search(
            domain, order='create_date desc'
        )
        return self._json_response({
            'returns': [{
                'id': r.id,
                'name': r.name,
                'sale_order_id': r.sale_order_id.id,
                'sale_order_name': r.sale_order_id.name,
                'partner_id': r.partner_id.id,
                'partner_name': r.partner_id.name,
                'product_id': r.product_id.id,
                'product_name': r.product_id.display_name,
                'quantity': r.quantity,
                'return_type': r.return_type,
                'reason_category': r.reason_category_id.name if r.reason_category_id else '',
                'reason_detail': r.reason_detail or '',
                'state': r.state,
                'request_date': r.request_date,
                'admin_notes': r.admin_notes or '',
            } for r in returns]
        })

    @http.route('/api/admin/returns/<int:return_id>/approve', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_approve_return(self, return_id, **kwargs):
        if resp := self._require_admin():
            return resp
        try:
            return_request = request.env['medical.return.request'].sudo().browse(return_id)
            if not return_request.exists():
                return self._json_response({'error': 'Return request not found'}, status=404)
            return_request.action_approve()
            return self._json_response({'success': True, 'state': return_request.state})
        except Exception as e:
            _logger.exception("Return approval failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/admin/returns/<int:return_id>/reject', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_reject_return(self, return_id, **kwargs):
        if resp := self._require_admin():
            return resp
        try:
            return_request = request.env['medical.return.request'].sudo().browse(return_id)
            if not return_request.exists():
                return self._json_response({'error': 'Return request not found'}, status=404)
            return_request.action_reject()
            return self._json_response({'success': True, 'state': return_request.state})
        except Exception as e:
            _logger.exception("Return rejection failed")
            return self._json_response({'error': str(e)}, status=500)