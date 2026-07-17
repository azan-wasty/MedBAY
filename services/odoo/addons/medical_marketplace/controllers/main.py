import base64
import json
import logging
import os

from odoo import fields, http
from odoo.http import request

_logger = logging.getLogger(__name__)

ODOO_DB_NAME = os.environ.get('ODOO_DB_NAME', 'odoo')
ADMIN_GROUP_XMLID = 'medical_marketplace.group_marketplace_admin'


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

        origin = request.httprequest.headers.get('Origin')
        headers = [
            ('Content-Type', 'application/json'),
            ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
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
        """Returns a 403 response if the current user isn't a marketplace
        admin, else None. Usage: `if resp := self._require_admin(): return resp`
        """
        if not self._is_admin():
            return self._json_response({'error': 'Forbidden: admin access required'}, status=403)
        return None

    # ------------------------------------------------------------------
    # CORS preflight
    # ------------------------------------------------------------------

    @http.route('/api/<path:subpath>', type='http', auth='none', methods=['OPTIONS'], csrf=False)
    def api_options(self, **kwargs):
        origin = request.httprequest.headers.get('Origin', '*')
        return request.make_response(
            '',
            headers=[
                ('Access-Control-Allow-Origin', origin),
                ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie'),
                ('Access-Control-Allow-Credentials', 'true'),
            ]
        )

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def _serialize_attribute_lines(self, product_tmpl):
        """Expand product.template.attribute.line records into a
        JSON-friendly shape the frontend can render directly, e.g.:
        [{"attribute_name": "Size", "display_type": "radio",
          "values": [{"id": 3, "name": "Medium", "html_color": false}, ...]}]
        Raw attribute_line_ids would otherwise just be a bare list of
        ids, which is useless to a client with no further Odoo access.
        """
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
        """Expand product.product variant records into a JSON-friendly
        shape describing each concrete sellable combination, e.g.:
        [{"id": 42, "price": 149.99, "qty_available": 30, "active": true,
          "combination": [{"attribute_id": 5, "attribute_name": "Color",
                            "value_id": 12, "value_name": "Blue"}, ...]}]
        This is what lets the frontend resolve a chosen set of attribute
        chips down to the specific product.product record that actually
        carries its own price/stock in Odoo — the product.template itself
        has neither.
        """
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
        domain = [('sale_ok', '=', True)]
        search_term = kwargs.get('search')
        if search_term:
            domain.append(('name', 'ilike', search_term))

        products = request.env['product.template'].sudo().search_read(
            domain,
            ['id', 'name', 'list_price', 'description_sale', 'categ_id',
             'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period', 'image_256',
             'vendor_id', 'stock_status', 'low_stock_threshold', 'attribute_line_ids']
        )
        return self._json_response(products)

    @http.route('/api/products/<int:product_id>', type='http', auth='public', methods=['GET'], csrf=False)
    def product_detail(self, product_id, **kwargs):
        product = request.env['product.template'].sudo().search_read(
            [('id', '=', product_id)],
            ['id', 'name', 'list_price', 'description_sale', 'categ_id',
             'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period', 'image_1920',
             'vendor_id', 'stock_status', 'low_stock_threshold', 'qty_available']
        )
        if not product:
            return self._json_response({'error': 'Product not found'}, status=404)

        product_tmpl = request.env['product.template'].sudo().browse(product_id)
        result = product[0]
        result['attribute_lines'] = self._serialize_attribute_lines(product_tmpl)
        result['variants'] = self._serialize_variants(product_tmpl)
        return self._json_response(result)

    # --- FEATURE: tiered/bulk pricing via pricelist ---
    @http.route('/api/products/<int:product_id>/pricing', type='http', auth='public', methods=['GET'], csrf=False)
    def product_pricing(self, product_id, **kwargs):
        """Returns quantity price breaks for a product, computed from
        product.pricelist.item records. Pass ?pricelist_id=<id> to price
        against a specific pricelist (e.g. a partner-specific B2B list);
        otherwise falls back to the first available pricelist.
        """
        product_tmpl = request.env['product.template'].sudo().browse(product_id)
        if not product_tmpl.exists():
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

            if partner.verification_status != 'verified':
                return self._json_response(
                    {'error': 'Your company must be verified before submitting RFQs.',
                     'verification_status': partner.verification_status},
                    status=403
                )

            body = json.loads(request.httprequest.data)
            items = body.get('items', [])

            if not items:
                return self._json_response({'error': 'No items specified'}, status=400)

            sale_order = request.env['sale.order'].sudo().create({
                'partner_id': partner.id,
            })

            for item in items:
                product_template = request.env['product.template'].sudo().browse(
                    item.get('product_id')
                )
                if not product_template.exists():
                    continue

                # If the buyer selected a specific variant combination (color,
                # size, etc.) on the product page, item['variant_id'] carries
                # the exact product.product id. We re-validate it actually
                # belongs to the requested template before trusting it, since
                # this is client-supplied input. Falling back to
                # product_variant_id (Odoo's "first/default variant" shortcut)
                # preserves old behavior for products with no variants, or
                # for any pre-existing cart items saved before variant
                # selection existed.
                variant = None
                variant_id = item.get('variant_id')
                if variant_id:
                    candidate = request.env['product.product'].sudo().browse(int(variant_id))
                    if candidate.exists() and candidate.product_tmpl_id.id == product_template.id:
                        variant = candidate

                if not variant:
                    variant = product_template.product_variant_id

                request.env['sale.order.line'].sudo().create({
                    'order_id': sale_order.id,
                    'product_id': variant.id,
                    'product_uom_qty': item.get('quantity', 1),
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

    # --- FEATURE: order tracking once quotation confirmed into sales order ---
    @http.route('/api/orders/<int:order_id>/tracking', type='http', auth='user', methods=['GET'], csrf=False)
    def order_tracking(self, order_id, **kwargs):
        try:
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            pickings = order.picking_ids.sudo().read(
                ['id', 'name', 'state', 'scheduled_date', 'date_done']
            )
            invoices = order.invoice_ids.sudo().read(
                ['id', 'name', 'state', 'payment_state', 'amount_total', 'invoice_date']
            )

            return self._json_response({
                'order_id': order.id,
                'name': order.name,
                'state': order.state,
                'invoice_status': order.invoice_status,
                'amount_total': order.amount_total,
                'date_order': order.date_order,
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

            # Retrieve lines with the actual variant sold, not the parent
            # template. medical.return.request.product_id (used by the
            # Returns feature) is a product.product field, so the id
            # reported here must be variant-level or return submissions
            # against a specific variant combination would silently
            # target the wrong (or a nonexistent) record.
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
                })

            return self._json_response({
                'id': order.id,
                'name': order.name,
                'state': order.state,
                'date_order': order.date_order,
                'amount_total': order.amount_total,
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

            # Confirm quotation to sales order
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
    # Admin: RFQ quoting (triggers the email notification via sale_order.py)
    # ------------------------------------------------------------------

    @http.route('/api/admin/rfq', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_list_rfqs(self, **kwargs):
        if resp := self._require_admin():
            return resp

        domain = [('state', '=', 'draft')]
        orders = request.env['sale.order'].sudo().search_read(
            domain,
            ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'],
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

        lines = order.order_line.sudo().read(['id', 'product_id', 'product_uom_qty', 'price_unit', 'price_subtotal'])
        return self._json_response({
            'id': order.id,
            'name': order.name,
            'state': order.state,
            'partner_id': order.partner_id.id,
            'partner_name': order.partner_id.name,
            'amount_total': order.amount_total,
            'lines': lines,
        })

    @http.route('/api/admin/rfq/<int:order_id>/quote', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_quote_rfq(self, order_id, **kwargs):
        """Set line prices and move the RFQ from draft to sent ('quoted').
        Moving to 'sent' triggers the email notification via the sale.order
        write() override in models/sale_order.py.

        Expected body: {"lines": [{"line_id": 12, "price_unit": 199.99}, ...]}
        """
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
    # Customer: return requests
    # ------------------------------------------------------------------

    @http.route('/api/returns', type='http', auth='user', methods=['POST'], csrf=False)
    def create_return_request(self, **kwargs):
        try:
            user = request.env.user
            order_id = int(kwargs.get('order_id', 0))
            product_id = int(kwargs.get('product_id', 0))
            quantity = float(kwargs.get('quantity', 0))
            return_type = kwargs.get('return_type', 'refund')
            reason = kwargs.get('reason', '')

            order = request.env['sale.order'].sudo().browse(order_id)
            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)
            if quantity <= 0:
                return self._json_response({'error': 'Quantity must be greater than zero'}, status=400)
            if return_type not in ('refund', 'replacement'):
                return self._json_response({'error': 'return_type must be "refund" or "replacement"'}, status=400)

            return_request = request.env['medical.return.request'].sudo().create({
                'sale_order_id': order.id,
                'product_id': product_id,
                'quantity': quantity,
                'return_type': return_type,
                'reason': reason,
            })
            return_request.action_submit()

            return self._json_response({
                'success': True,
                'return_id': return_request.id,
                'name': return_request.name,
                'state': return_request.state,
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
                'product_id': r.product_id.id,
                'product_name': r.product_id.display_name,
                'quantity': r.quantity,
                'return_type': r.return_type,
                'state': r.state,
                'request_date': r.request_date,
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