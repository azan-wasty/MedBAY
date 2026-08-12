import base64
import datetime
import json
import logging
import os

from odoo import SUPERUSER_ID, fields, http  # type: ignore
from odoo.http import request  # type: ignore

_logger = logging.getLogger(__name__)

ODOO_DB_NAME = os.environ.get('ODOO_DB_NAME', 'odoo')
ADMIN_GROUP_XMLID = 'medical_marketplace.group_marketplace_admin'
FEATURED_MAX = 8

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

    def _json_response(self, data, status=200, cache_control=None):
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
        if cache_control:
            headers.append(('Cache-Control', cache_control))
        return request.make_response(
            json.dumps(_decode_bytes(data), default=str),
            headers=headers,
            status=status
        )

    def _is_admin(self):
        user = request.env.user
        if not user or user._is_public():
            return False
        return bool(
            user.id in (1, 2)
            or user.has_group(ADMIN_GROUP_XMLID)
            or user.has_group('base.group_system')
            or user.has_group('base.group_erp_manager')
        )

    def _require_user(self):
        """Returns a 401 response if the current session has no authenticated user."""
        user = request.env.user
        if not user or user._is_public() or not request.session.uid:
            return self._json_response({'error': 'Unauthorized: login required'}, status=401)
        return None

    def _require_admin(self):
        """Returns 401 if unauthenticated, 403 if authenticated but not admin."""
        if resp := self._require_user():
            return resp
        if not self._is_admin():
            return self._json_response({'error': 'Forbidden: admin access required'}, status=403)
        return None

    def _get_effective_verification_status(self, partner):
        """Return verification status of partner or fallback to parent company verification status."""
        if not partner:
            return 'pending'
        status = partner.verification_status
        if status in ('verified', 'rejected'):
            return status
        if partner.parent_id and partner.parent_id.verification_status:
            return partner.parent_id.verification_status
        return status or 'pending'

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
            pickings = getattr(order, 'picking_ids', request.env['stock.picking'])
            outgoing = pickings.filtered(
                lambda p: p.picking_type_id.code == 'outgoing'
            ) if hasattr(order, 'picking_ids') else request.env['stock.picking']

            # Stage 4 & 5: Delivered or Completed
            if outgoing and all(p.state == 'done' for p in outgoing):
                invoices = getattr(order, 'invoice_ids', request.env['account.move']).filtered(lambda i: i.state == 'posted')
                if any(i.payment_state in ('paid', 'in_payment') for i in invoices):
                    return 'completed'
                return 'delivered'

            # Stage 3: Out for Delivery (when tracking reference / carrier tracking is attached)
            if order.tracking_reference or (outgoing and any(getattr(p, 'carrier_tracking_ref', False) for p in outgoing)):
                return 'out_for_delivery'

            # Stage 2: Processing (Order confirmed by buyer/admin, preparing in warehouse)
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

        # ── Text search ──────────────────────────────────────────────────
        search_term = kwargs.get('search')
        if search_term:
            domain.append(('name', 'ilike', search_term))

        # ── Category filter ──────────────────────────────────────────────
        category = kwargs.get('category')
        if category:
            domain.append(('categ_id.name', '=', category))

        # ── Price range ──────────────────────────────────────────────────
        min_price = kwargs.get('min_price')
        max_price = kwargs.get('max_price')
        if min_price:
            try:
                domain.append(('list_price', '>=', float(min_price)))
            except (ValueError, TypeError):
                pass
        if max_price:
            try:
                domain.append(('list_price', '<=', float(max_price)))
            except (ValueError, TypeError):
                pass

        # ── Stock status (comma-separated, OR within) ────────────────────
        stock_status_param = kwargs.get('stock_status', '')
        if stock_status_param:
            statuses = [s.strip() for s in stock_status_param.split(',') if s.strip()]
            if statuses:
                domain.append(('stock_status', 'in', statuses))

        # ── Vendor IDs (comma-separated, OR within) ──────────────────────
        vendor_ids_param = kwargs.get('vendor_ids', '')
        if vendor_ids_param:
            try:
                vendor_ids = [int(v.strip()) for v in vendor_ids_param.split(',') if v.strip()]
                if vendor_ids:
                    domain.append(('vendor_id', 'in', vendor_ids))
            except (ValueError, TypeError):
                pass

        # ── Pagination & Sorting ──────────────────────────────────────────
        limit_param = kwargs.get('limit')
        offset_param = kwargs.get('offset')
        sort_param = kwargs.get('sort')

        limit = None
        offset = 0
        if limit_param is not None:
            try:
                l_val = int(limit_param)
                if l_val > 0:
                    limit = l_val
            except (ValueError, TypeError):
                pass

        if offset_param is not None:
            try:
                o_val = int(offset_param)
                if o_val >= 0:
                    offset = o_val
            except (ValueError, TypeError):
                pass

        order = 'name asc'
        if sort_param == 'price_asc':
            order = 'list_price asc'
        elif sort_param == 'price_desc':
            order = 'list_price desc'
        elif sort_param == 'name_asc':
            order = 'name asc'
        elif sort_param == 'name_desc':
            order = 'name desc'
        elif sort_param == 'newest':
            order = 'id desc'

        ProductModel = request.env['product.template'].sudo()
        total_count = ProductModel.search_count(domain)

        products = ProductModel.search_read(
            domain,
            ['id', 'name', 'list_price', 'description_sale', 'categ_id',
             'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period',
             'image_256', 'has_vendor_company', 'vendor_id', 'stock_status', 'low_stock_threshold',
             'attribute_line_ids', 'marketplace_published', 'marketplace_featured', 'featured_sequence'],
            offset=offset,
            limit=limit,
            order=order,
        )

        if limit is not None:
            return self._json_response({
                'products': products,
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': (offset + len(products)) < total_count,
            }, cache_control='no-store')

        return self._json_response(products, cache_control='no-store')

    @http.route('/api/products/featured', type='http', auth='public', methods=['GET'], csrf=False)
    def list_featured_products(self, **kwargs):
        domain = [
            ('sale_ok', '=', True),
            ('marketplace_published', '=', True),
            ('marketplace_featured', '=', True),
        ]
        products = request.env['product.template'].sudo().search_read(
            domain,
            ['id', 'name', 'list_price', 'description_sale', 'categ_id',
             'certification_info', 'unit_of_measure', 'min_order_qty', 'warranty_period',
             'image_256', 'image_1920', 'has_vendor_company', 'vendor_id', 'stock_status',
             'low_stock_threshold', 'attribute_line_ids', 'marketplace_published',
             'marketplace_featured', 'featured_sequence'],
            order='featured_sequence asc, name asc',
            limit=FEATURED_MAX,
        )
        return self._json_response(products, cache_control='no-store')


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

    @http.route('/api/admin/products/top', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_top_products(self, **kwargs):
        """Best-selling products across confirmed orders, ranked by revenue.

        Powers the admin dashboard's Top Products table (replaces the old
        verification/return charts with actionable sales data).
        """
        if resp := self._require_admin():
            return resp

        try:
            limit = int(kwargs.get('limit', 5))
        except (TypeError, ValueError):
            limit = 5
        limit = max(1, min(limit, 20))

        lines = request.env['sale.order.line'].sudo().search([
            ('order_id.state', 'in', ('sale', 'done')),
            ('product_id', '!=', False),
        ])

        stats = {}
        for line in lines:
            product = line.product_id
            entry = stats.setdefault(product.id, {
                'product_id': product.id,
                'product_name': product.display_name,
                'quantity_sold': 0.0,
                'revenue': 0.0,
                'order_ids': set(),
            })
            entry['quantity_sold'] += line.product_uom_qty
            entry['revenue'] += line.price_subtotal
            entry['order_ids'].add(line.order_id.id)

        ranked = sorted(stats.values(), key=lambda e: e['revenue'], reverse=True)[:limit]
        result = [{
            'product_id': e['product_id'],
            'product_name': e['product_name'],
            'quantity_sold': e['quantity_sold'],
            'revenue': e['revenue'],
            'order_count': len(e['order_ids']),
        } for e in ranked]

        return self._json_response(result)

    @http.route('/api/admin/analytics', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_analytics(self, **kwargs):
        """Unified Admin Dashboard Analytics endpoint with server-side date range filtering."""
        if resp := self._require_admin():
            return resp

        try:
            now = fields.Datetime.now()

            preset = kwargs.get('preset', kwargs.get('period', 'all_time'))
            date_from_str = kwargs.get('date_from', kwargs.get('from'))
            date_to_str = kwargs.get('date_to', kwargs.get('to'))

            start_dt = None
            end_dt = None

            if preset == 'today':
                start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'yesterday':
                yesterday = now - datetime.timedelta(days=1)
                start_dt = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
                end_dt = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'last_7_days':
                start_dt = (now - datetime.timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'last_30_days':
                start_dt = (now - datetime.timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'this_month':
                start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'last_month':
                first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                last_day_prev_month = first_this_month - datetime.timedelta(days=1)
                start_dt = last_day_prev_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_dt = last_day_prev_month.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'this_year':
                start_dt = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            elif preset == 'custom' and date_from_str and date_to_str:
                try:
                    start_dt = fields.Datetime.to_datetime(f"{date_from_str} 00:00:00")
                    end_dt = fields.Datetime.to_datetime(f"{date_to_str} 23:59:59")
                except Exception:
                    start_dt = None
                    end_dt = None
            elif preset == 'all_time':
                start_dt = None
                end_dt = None
            else:
                start_dt = None
                end_dt = None
                preset = 'all_time'

            # Build Odoo ORM domains
            order_domain = []
            partner_domain = []
            return_domain = []

            if start_dt:
                order_domain.append(('create_date', '>=', start_dt))
                partner_domain.append(('create_date', '>=', start_dt))
                return_domain.append(('create_date', '>=', start_dt))
            if end_dt:
                order_domain.append(('create_date', '<=', end_dt))
                partner_domain.append(('create_date', '<=', end_dt))
                return_domain.append(('create_date', '<=', end_dt))

            all_orders = request.env['sale.order'].sudo().search(order_domain)
            confirmed_orders = all_orders.filtered(lambda o: o.state in ('sale', 'done'))

            total_sales = sum(confirmed_orders.mapped('amount_total'))
            confirmed_count = len(confirmed_orders)
            total_rfqs = len(all_orders)

            aov = round(total_sales / confirmed_count, 2) if confirmed_count > 0 else 0.0
            conversion_rate = round((confirmed_count / total_rfqs) * 100, 1) if total_rfqs > 0 else 0.0

            # MoM comparison
            first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if first_of_this_month.month == 1:
                first_of_last_month = first_of_this_month.replace(year=first_of_this_month.year - 1, month=12)
            else:
                first_of_last_month = first_of_this_month.replace(month=first_of_this_month.month - 1)

            all_confirmed_global = request.env['sale.order'].sudo().search([('state', 'in', ('sale', 'done'))])
            this_m = all_confirmed_global.filtered(lambda o: o.date_order and fields.Datetime.to_datetime(o.date_order) >= first_of_this_month)
            last_m = all_confirmed_global.filtered(lambda o: o.date_order and first_of_last_month <= fields.Datetime.to_datetime(o.date_order) < first_of_this_month)
            this_m_sales = sum(this_m.mapped('amount_total'))
            last_m_sales = sum(last_m.mapped('amount_total'))
            sales_growth_mom = round(((this_m_sales - last_m_sales) / last_m_sales) * 100, 1) if last_m_sales > 0 else (100.0 if this_m_sales > 0 else 0.0)

            # Order breakdown
            order_breakdown = {
                'draft': len(all_orders.filtered(lambda o: o.state == 'draft')),
                'sent': len(all_orders.filtered(lambda o: o.state == 'sent')),
                'sale': len(all_orders.filtered(lambda o: o.state == 'sale')),
                'done': len(all_orders.filtered(lambda o: o.state == 'done')),
                'cancel': len(all_orders.filtered(lambda o: o.state == 'cancel')),
                'total': total_rfqs,
            }

            # Companies breakdown (Platform queue + Period signups)
            internal_partner_ids = request.env['res.company'].sudo().search([]).mapped('partner_id').ids
            all_platform_companies = request.env['res.partner'].sudo().search([('id', 'not in', internal_partner_ids)])
            total_companies = len(all_platform_companies)
            verified_companies = len(all_platform_companies.filtered(lambda c: c.verification_status == 'verified'))
            pending_companies = len(all_platform_companies.filtered(lambda c: c.verification_status == 'pending'))
            rejected_companies = len(all_platform_companies.filtered(lambda c: c.verification_status == 'rejected'))
            verified_pct = round((verified_companies / total_companies) * 100, 1) if total_companies > 0 else 0.0

            company_period_domain = [('id', 'not in', internal_partner_ids)]
            if start_dt:
                company_period_domain.append(('create_date', '>=', start_dt))
            if end_dt:
                company_period_domain.append(('create_date', '<=', end_dt))
            period_companies = request.env['res.partner'].sudo().search(company_period_domain)

            company_breakdown = {
                'total': total_companies,
                'verified': verified_companies,
                'pending': pending_companies,
                'rejected': rejected_companies,
                'verified_pct': verified_pct,
                'new_signups_period': len(period_companies),
            }

            # Returns
            returns = request.env['medical.return.request'].sudo().search(return_domain)
            active_returns = len(returns.filtered(lambda r: r.state == 'requested'))

            # Dynamic Granularity Revenue Trend
            trend_data = []
            if start_dt and end_dt:
                days_diff = (end_dt - start_dt).days
                if days_diff <= 14:
                    curr_d = start_dt
                    while curr_d <= end_dt:
                        next_d = curr_d + datetime.timedelta(days=1)
                        m_orders = confirmed_orders.filtered(
                            lambda o: curr_d <= (fields.Datetime.to_datetime(o.date_order or o.create_date)) < next_d
                        )
                        trend_data.append({
                            'month': curr_d.strftime('%b %d'),
                            'revenue': round(sum(m_orders.mapped('amount_total')), 2),
                            'orders': len(m_orders),
                        })
                        curr_d = next_d
                elif days_diff <= 90:
                    curr_d = start_dt
                    while curr_d <= end_dt:
                        next_d = curr_d + datetime.timedelta(days=7)
                        m_orders = confirmed_orders.filtered(
                            lambda o: curr_d <= (fields.Datetime.to_datetime(o.date_order or o.create_date)) < next_d
                        )
                        trend_data.append({
                            'month': curr_d.strftime('%b %d'),
                            'revenue': round(sum(m_orders.mapped('amount_total')), 2),
                            'orders': len(m_orders),
                        })
                        curr_d = next_d
                else:
                    for i in range(5, -1, -1):
                        m_year = now.year
                        m_month = now.month - i
                        while m_month <= 0:
                            m_month += 12
                            m_year -= 1
                        s_m = now.replace(year=m_year, month=m_month, day=1, hour=0, minute=0, second=0, microsecond=0)
                        e_m = s_m.replace(year=m_year + 1, month=1) if m_month == 12 else s_m.replace(month=m_month + 1)
                        m_orders = confirmed_orders.filtered(
                            lambda o: s_m <= (fields.Datetime.to_datetime(o.date_order or o.create_date)) < e_m
                        )
                        trend_data.append({
                            'month': s_m.strftime('%b %Y'),
                            'revenue': round(sum(m_orders.mapped('amount_total')), 2),
                            'orders': len(m_orders),
                        })
            else:
                for i in range(5, -1, -1):
                    m_year = now.year
                    m_month = now.month - i
                    while m_month <= 0:
                        m_month += 12
                        m_year -= 1
                    s_m = now.replace(year=m_year, month=m_month, day=1, hour=0, minute=0, second=0, microsecond=0)
                    e_m = s_m.replace(year=m_year + 1, month=1) if m_month == 12 else s_m.replace(month=m_month + 1)
                    m_orders = confirmed_orders.filtered(
                        lambda o: s_m <= (fields.Datetime.to_datetime(o.date_order or o.create_date)) < e_m
                    )
                    trend_data.append({
                        'month': s_m.strftime('%b %Y'),
                        'revenue': round(sum(m_orders.mapped('amount_total')), 2),
                        'orders': len(m_orders),
                    })

            # Top Customers (Group by Commercial Partner)
            customer_stats = {}
            for order in confirmed_orders:
                comm_partner = order.partner_id.commercial_partner_id if order.partner_id else False
                if not comm_partner:
                    continue
                c_entry = customer_stats.setdefault(comm_partner.id, {
                    'partner_id': comm_partner.id,
                    'name': comm_partner.display_name or comm_partner.name,
                    'order_count': 0,
                    'total_spend': 0.0,
                    'verification_status': comm_partner.verification_status or 'pending',
                })
                c_entry['order_count'] += 1
                c_entry['total_spend'] += order.amount_total

            top_customers = sorted(customer_stats.values(), key=lambda x: x['total_spend'], reverse=True)[:5]

            # Recent Activity
            activity = []
            for o in all_orders.sorted(key=lambda r: r.create_date or r.date_order or fields.Datetime.now(), reverse=True)[:5]:
                activity.append({
                    'id': f"rfq-{o.id}",
                    'type': 'rfq',
                    'title': f"RFQ {o.name}",
                    'description': f"{o.partner_id.display_name if o.partner_id else 'Buyer'} • ${round(o.amount_total, 2):,.2f}",
                    'status': o.state,
                    'date': str(o.date_order or o.create_date or ''),
                })
            for c in period_companies.sorted(key=lambda r: r.create_date or fields.Datetime.now(), reverse=True)[:5]:
                activity.append({
                    'id': f"company-{c.id}",
                    'type': 'company',
                    'title': f"Company Registered: {c.name}",
                    'description': f"Reg: {c.registration_number or 'N/A'}",
                    'status': c.verification_status or 'pending',
                    'date': str(c.create_date or ''),
                })
            for r in returns.sorted(key=lambda r: r.create_date or fields.Datetime.now(), reverse=True)[:5]:
                activity.append({
                    'id': f"return-{r.id}",
                    'type': 'return',
                    'title': f"Return Request {r.name}",
                    'description': f"Product: {r.product_id.display_name if r.product_id else 'N/A'}",
                    'status': r.state,
                    'date': str(r.create_date or ''),
                })

            activity.sort(key=lambda x: x['date'], reverse=True)
            recent_activity = activity[:10]

            # Active Range Label
            if preset == 'all_time':
                active_range_label = 'All Time'
            elif start_dt and end_dt:
                active_range_label = f"{start_dt.strftime('%b %d, %Y')} – {end_dt.strftime('%b %d, %Y')}"
            else:
                active_range_label = 'Last 30 Days'

            return self._json_response({
                'active_range_label': active_range_label,
                'preset': preset,
                'kpis': {
                    'total_sales': round(total_sales, 2),
                    'aov': aov,
                    'total_orders': confirmed_count,
                    'total_rfqs': total_rfqs,
                    'conversion_rate': conversion_rate,
                    'sales_growth_mom': sales_growth_mom,
                    'verified_pct': verified_pct,
                    'active_returns': active_returns,
                },
                'order_breakdown': order_breakdown,
                'company_breakdown': company_breakdown,
                'revenue_trend': trend_data,
                'top_customers': top_customers,
                'recent_activity': recent_activity,
            })
        except Exception as e:
            _logger.exception("Failed to calculate admin analytics")
            return self._json_response({'error': str(e)}, status=500)

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------

    @http.route('/api/auth/register', type='http', auth='none', methods=['POST'], csrf=False)
    def register(self, **kwargs):
        try:
            if not request.session.db:
                request.session.db = ODOO_DB_NAME
            request.update_env(user=SUPERUSER_ID)

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

            company = request.env['res.partner'].sudo().with_context(
                mail_create_nosubscribe=True,
                mail_create_nolog=True,
                tracking_disable=True
            ).create({
                'name': name,
                'is_company': True,
                'registration_number': registration_number,
                'email': email,
            })

            user = request.env['res.users'].sudo().with_context(
                no_reset_password=True,
                signup_force_type_in_url=True,
                mail_create_nosubscribe=True,
                mail_create_nolog=True,
                tracking_disable=True
            ).create({
                'name': name,
                'login': email,
                'password': password,
                'groups_id': [(6, 0, [request.env.ref('base.group_portal').id])]
            })

            if user.partner_id:
                user.partner_id.sudo().with_context(tracking_disable=True).write({
                    'parent_id': company.id,
                    'registration_number': registration_number,
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

            try:
                uid = request.session.authenticate(ODOO_DB_NAME, login_val, password)
            except Exception:
                return self._json_response({'error': 'Invalid email or password'}, status=401)

            if not uid:
                return self._json_response({'error': 'Invalid email or password'}, status=401)

            user = request.env['res.users'].sudo().browse(uid)
            clean_name = user.name or ''
            if not clean_name or clean_name.startswith('Partner #') or clean_name.startswith('Partner '):
                if user.partner_id and user.partner_id.name and not user.partner_id.name.startswith('Partner #'):
                    clean_name = user.partner_id.name
                else:
                    clean_name = user.login.split('@')[0].capitalize() if user.login else 'Organization'

            v_status = self._get_effective_verification_status(user.partner_id)
            return self._json_response({
                'success': True,
                'session_id': request.session.sid,
                'user': {
                    'id': user.id,
                    'name': clean_name,
                    'email': user.login,
                    'partner_id': user.partner_id.id,
                    'is_admin': self._is_admin(),
                    'verification_status': v_status,
                }
            })

        except Exception as e:
            _logger.exception("Login failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/auth/whoami', type='http', auth='public', methods=['GET'], csrf=False)
    def whoami(self, **kwargs):
        if resp := self._require_user():
            return resp
        user = request.env.user
        v_status = self._get_effective_verification_status(user.partner_id)
        return self._json_response({
            'sid': request.session.sid,
            'uid': request.session.uid,
            'db': request.session.db,
            'login': user.login,
            'is_admin': self._is_admin(),
            'verification_status': v_status,
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
            v_status = self._get_effective_verification_status(partner)
            if require_verification and v_status != 'verified':
                return self._json_response(
                    {'error': 'Your company must be verified before submitting RFQs.',
                     'verification_status': v_status},
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

            orders = request.env['sale.order'].sudo().search(
                [('partner_id', '=', partner_id)],
            )

            result = []
            for order in orders:
                result.append({
                    'id': order.id,
                    'name': order.name,
                    'date_order': order.date_order,
                    'amount_total': order.amount_total,
                    'state': order.state,
                    'invoice_status': order.invoice_status,
                    'buyer_stage': self._compute_buyer_stage(order),
                })

            return self._json_response(result)

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
            ) if hasattr(order, 'picking_ids') else []
            invoices = order.invoice_ids.sudo().read(
                ['id', 'name', 'state', 'payment_state', 'amount_total', 'invoice_date', 'partner_bank_id']
            ) if hasattr(order, 'invoice_ids') else []

            # Enrich unpaid invoices with recipient bank info so buyers know where to wire payment.
            for inv in invoices:
                bank_field = inv.pop('partner_bank_id', False)
                inv['recipient_bank'] = False
                if bank_field:
                    bank_id = bank_field[0] if isinstance(bank_field, (list, tuple)) else bank_field
                    bank_record = request.env['res.partner.bank'].sudo().browse(bank_id)
                    if bank_record.exists():
                        inv['recipient_bank'] = {
                            'bank_name': bank_record.bank_id.name or False,
                            'account_number': bank_record.acc_number or False,
                            'account_holder': bank_record.acc_holder_name or bank_record.partner_id.name or False,
                        }

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
                'rejection_reason': order.rejection_reason or None,
                'last_counter_by': order.last_counter_by or None,
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

    @http.route('/api/rfq/<int:order_id>/reject', type='http', auth='user', methods=['POST'], csrf=False)
    def reject_rfq(self, order_id, **kwargs):
        """Allow buyer to reject a seller quote with an optional rejection reason."""
        try:
            body = json.loads(request.httprequest.data or '{}')
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            reason = body.get('rejection_reason', '').strip()
            order.write({
                'state': 'cancel',
                'rejection_reason': reason or 'Rejected by buyer.',
                'last_counter_by': 'buyer',
            })

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'rejection_reason': order.rejection_reason,
            })
        except Exception as e:
            _logger.exception("RFQ rejection failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/rfq/<int:order_id>/counter', type='http', auth='user', methods=['POST'], csrf=False)
    def counter_rfq(self, order_id, **kwargs):
        """Allow buyer to submit a counter-offer (update line target prices & notes), returning RFQ to draft."""
        try:
            body = json.loads(request.httprequest.data or '{}')
            order = request.env['sale.order'].sudo().browse(order_id)
            user = request.env.user

            if not order.exists() or order.partner_id.id != user.partner_id.id:
                return self._json_response({'error': 'Order not found'}, status=404)

            lines_update = body.get('lines', [])
            buyer_notes = body.get('buyer_notes')

            for line_item in lines_update:
                line = request.env['sale.order.line'].sudo().browse(line_item.get('line_id'))
                if line.exists() and line.order_id.id == order.id:
                    target_p = line_item.get('target_price_unit')
                    if target_p is not None:
                        line.write({'target_price_unit': float(target_p)})

            vals = {
                'state': 'draft',
                'last_counter_by': 'buyer',
            }
            if buyer_notes is not None:
                vals['buyer_notes'] = buyer_notes

            order.write(vals)

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'amount_total': order.amount_total,
                'last_counter_by': order.last_counter_by,
            })
        except Exception as e:
            _logger.exception("RFQ counter offer failed")
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

        # Exclude Odoo's own internal company partners.
        # res.company records have a linked res.partner via `partner_id`; we
        # collect those IDs and filter them out so only buyer-registered
        # organisations appear in the verification list.
        internal_partner_ids = request.env['res.company'].sudo().search([]).mapped('partner_id').ids

        domain = [
            ('is_company', '=', True),
            ('id', 'not in', internal_partner_ids),
        ]
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

        targets = partner | partner.child_ids
        targets.write({
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

        targets = partner | partner.child_ids
        targets.write({
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
            states = [s.strip() for s in state_param.split(',') if s.strip()]
            domain = [('state', 'in', states)]
        else:
            # Default view: open quotations awaiting admin pricing or buyer response.
            domain = [('state', 'in', ('draft', 'sent'))]
        limit = kwargs.get('limit')
        try:
            limit = int(limit) if limit else None
        except (TypeError, ValueError):
            limit = None
        orders = request.env['sale.order'].sudo().search(
            domain, order='date_order desc', limit=limit,
        )

        result = []
        for order in orders:
            # Buyer's requested total: what they'd pay at their proposed unit
            # prices (falls back to the current unit price on lines where the
            # buyer didn't propose one), vs. amount_total which is the actual
            # order total at the currently-set unit prices.
            requested_total = sum(
                (line.target_price_unit or line.price_unit) * line.product_uom_qty
                for line in order.order_line
            )
            result.append({
                'id': order.id,
                'name': order.name,
                'partner_id': (order.partner_id.id, order.partner_id.display_name) if order.partner_id else False,
                'date_order': order.date_order,
                'amount_total': order.amount_total,
                'requested_total': requested_total,
                'state': order.state,
                'carrier_id': (order.carrier_id.id, order.carrier_id.display_name) if order.carrier_id else False,
                'tracking_reference': order.tracking_reference or False,
            })
        return self._json_response(result)

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
            'rejection_reason': order.rejection_reason or None,
            'last_counter_by': order.last_counter_by or None,
            'lines': lines,
        })

    @http.route('/api/admin/rfq/<int:order_id>/quote', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_quote_rfq(self, order_id, **kwargs):
        """Set line prices and move RFQ from draft → sent."""
        if resp := self._require_admin():
            return resp

        try:
            body = json.loads(request.httprequest.data)
            order = request.env['sale.order'].sudo().browse(order_id)
            if not order.exists():
                return self._json_response({'error': 'RFQ not found'}, status=404)

            # Context flags suppress mail sending & chatter tracking to avoid 500 errors when no SMTP server is set up
            order_ctx = order.sudo().with_context(
                mail_create_nosubscribe=True,
                mail_create_nolog=True,
                mail_notrack=True,
                tracking_disable=True
            )

            # Update line prices first
            for line_update in body.get('lines', []):
                line = request.env['sale.order.line'].sudo().browse(line_update.get('line_id'))
                if line.exists() and line.order_id.id == order.id:
                    line.write({'price_unit': line_update.get('price_unit', line.price_unit)})

            # Safely transition state to 'sent' without triggering mail delivery failures
            order_ctx.write({
                'state': 'sent',
                'last_counter_by': 'seller',
            })

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'amount_total': order.amount_total,
            })
        except Exception as e:
            _logger.exception("RFQ quoting failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/admin/rfq/<int:order_id>/reject', type='http', auth='user', methods=['POST'], csrf=False)
    def admin_reject_rfq(self, order_id, **kwargs):
        """Allow seller/admin to reject an RFQ or buyer counter request."""
        if resp := self._require_admin():
            return resp

        try:
            body = json.loads(request.httprequest.data or '{}')
            order = request.env['sale.order'].sudo().browse(order_id)
            if not order.exists():
                return self._json_response({'error': 'RFQ not found'}, status=404)

            reason = body.get('rejection_reason', '').strip()
            order.write({
                'state': 'cancel',
                'rejection_reason': reason or 'Rejected by supplier.',
                'last_counter_by': 'seller',
            })

            return self._json_response({
                'success': True,
                'order_id': order.id,
                'state': order.state,
                'rejection_reason': order.rejection_reason,
            })
        except Exception as e:
            _logger.exception("Admin RFQ rejection failed")
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

            # Returns can only be requested once the order has actually been delivered —
            # mirrors the same outgoing-picking check used for the buyer-facing order stage.
            pickings = getattr(order, 'picking_ids', request.env['stock.picking'])
            outgoing = pickings.filtered(
                lambda p: p.picking_type_id.code == 'outgoing'
            ) if hasattr(order, 'picking_ids') else request.env['stock.picking']
            if not outgoing or not all(p.state == 'done' for p in outgoing):
                return self._json_response(
                    {'error': 'This order has not been delivered yet, so it is not eligible for a return.'},
                    status=400,
                )

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

    # ------------------------------------------------------------------
    # Admin: Analytics & Top Products
    # ------------------------------------------------------------------

    @http.route('/api/admin/analytics/summary', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_analytics_summary(self, **kwargs):
        """Marketplace-wide earnings & sales analytics summary for admin dashboard."""
        if resp := self._require_admin():
            return resp

        try:
            try:
                days = int(kwargs.get('days', 30))
            except (TypeError, ValueError):
                days = 30

            # Confirmed orders
            confirmed_orders = request.env['sale.order'].sudo().search([('state', 'in', ('sale', 'done'))])
            lifetime_revenue = float(sum(order.amount_total for order in confirmed_orders))
            lifetime_order_count = len(confirmed_orders)

            # Total items sold from confirmed order lines
            confirmed_lines = request.env['sale.order.line'].sudo().search([('order_id.state', 'in', ('sale', 'done'))])
            lifetime_items_sold = float(sum(line.product_uom_qty for line in confirmed_lines))

            avg_order_value = (lifetime_revenue / lifetime_order_count) if lifetime_order_count > 0 else 0.0

            # Pending quotes/RFQs
            pending_orders = request.env['sale.order'].sudo().search([('state', 'in', ('draft', 'sent'))])
            pending_value = float(sum(order.amount_total for order in pending_orders))
            pending_count = len(pending_orders)

            # Revenue series over the last `days` days
            today = fields.Date.today()
            date_from = today - datetime.timedelta(days=days - 1)

            # Group confirmed orders by date_order
            date_totals = {}
            for i in range(days):
                d_str = fields.Date.to_string(date_from + datetime.timedelta(days=i))
                date_totals[d_str] = {'revenue': 0.0, 'orders': 0}

            window_orders = 0
            window_revenue = 0.0

            for order in confirmed_orders:
                if order.date_order:
                    order_date_str = fields.Date.to_string(order.date_order.date() if hasattr(order.date_order, 'date') else order.date_order)
                    if order_date_str in date_totals:
                        date_totals[order_date_str]['revenue'] += float(order.amount_total)
                        date_totals[order_date_str]['orders'] += 1
                        window_revenue += float(order.amount_total)
                        window_orders += 1

            revenue_series = [
                {'date': d, 'revenue': round(date_totals[d]['revenue'], 2), 'orders': date_totals[d]['orders']}
                for d in sorted(date_totals.keys())
            ]

            return self._json_response({
                'lifetime_revenue': round(lifetime_revenue, 2),
                'lifetime_order_count': lifetime_order_count,
                'lifetime_items_sold': round(lifetime_items_sold, 2),
                'avg_order_value': round(avg_order_value, 2),
                'pending_value': round(pending_value, 2),
                'pending_count': pending_count,
                'window_days': days,
                'window_revenue': round(window_revenue, 2),
                'window_orders': window_orders,
                'revenue_series': revenue_series,
            }, cache_control='no-store, no-cache, must-revalidate, max-age=0')
        except Exception as e:
            _logger.exception("Admin analytics summary failed")
            return self._json_response({'error': str(e)}, status=500)

    @http.route('/api/admin/products/top', type='http', auth='user', methods=['GET'], csrf=False)
    def admin_top_products(self, **kwargs):
        """Top best-selling products by revenue for admin dashboard."""
        if resp := self._require_admin():
            return resp

        try:
            try:
                limit = int(kwargs.get('limit', 5))
            except (TypeError, ValueError):
                limit = 5

            lines = request.env['sale.order.line'].sudo().search([('order_id.state', 'in', ('sale', 'done'))])

            product_stats = {}
            for line in lines:
                product = line.product_id
                if not product or not product.exists():
                    continue
                p_id = product.product_tmpl_id.id if hasattr(product, 'product_tmpl_id') and product.product_tmpl_id else product.id
                p_name = product.display_name or product.name
                if p_id not in product_stats:
                    product_stats[p_id] = {
                        'product_id': p_id,
                        'product_name': p_name,
                        'quantity_sold': 0.0,
                        'revenue': 0.0,
                        'order_ids': set(),
                    }
                product_stats[p_id]['quantity_sold'] += float(line.product_uom_qty)
                product_stats[p_id]['revenue'] += float(line.price_subtotal)
                if line.order_id:
                    product_stats[p_id]['order_ids'].add(line.order_id.id)

            sorted_products = sorted(product_stats.values(), key=lambda x: x['revenue'], reverse=True)[:limit]

            result = [
                {
                    'product_id': p['product_id'],
                    'product_name': p['product_name'],
                    'quantity_sold': round(p['quantity_sold'], 2),
                    'revenue': round(p['revenue'], 2),
                    'order_count': len(p['order_ids']),
                }
                for p in sorted_products
            ]

            return self._json_response(result, cache_control='no-store, no-cache, must-revalidate, max-age=0')
        except Exception as e:
            _logger.exception("Admin top products failed")
            return self._json_response({'error': str(e)}, status=500)