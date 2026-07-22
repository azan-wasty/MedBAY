import { ODOO_API_BASE_URL } from './config';

declare const process: any;

export interface OdooRequestInit extends RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

// --- Product types ---

export interface AttributeValue {
  id: number;
  name: string;
  html_color: string | false;
}

export interface AttributeLine {
  attribute_id: number;
  attribute_name: string;
  display_type: string;
  values: AttributeValue[];
}

export interface PriceBreak {
  min_qty: number;
  price: number;
  discount_pct: number;
}

export interface ProductPricing {
  product_id: number;
  base_price: number;
  currency: string | null;
  price_breaks: PriceBreak[];
}

export interface VariantCombinationValue {
  attribute_id: number;
  attribute_name: string;
  value_id: number;
  value_name: string;
}

export interface ProductVariant {
  id: number;
  price: number;
  qty_available: number;
  active: boolean;
  combination: VariantCombinationValue[];
}


export interface Product {
  id: number;
  name: string;
  list_price: number;
  description_sale: string;
  categ_id: [number, string] | boolean;
  certification_info: string | boolean;
  unit_of_measure: string | boolean;
  min_order_qty: number;
  warranty_period: string | boolean;
  image_1920?: string | boolean;
  image_256?: string | boolean;
  vendor_id: [number, string] | boolean;
  has_vendor_company?: boolean;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked';
  low_stock_threshold?: number;
  qty_available?: number;
  marketplace_published?: boolean;
  attribute_line_ids?: number[];
  attribute_lines?: AttributeLine[];
  variants?: ProductVariant[];
}

// --- Auth / User types ---

export interface User {
  id: number;
  name: string;
  email: string;
  partner_id: number;
  is_admin?: boolean;
  verification_status?: 'pending' | 'verified' | 'rejected';
}

export interface LoginResult {
  success: boolean;
  session_id?: string;
  user?: User;
  error?: string;
}

// --- Order / RFQ types ---

export interface RFQItem {
  id: number;
  name: string;
  date_order: string;
  amount_total: number;
  state: string;
}

export interface RFQLine {
  id: number;
  product_id: number;
  product_template_id: number;
  product_name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  target_price_unit?: number | null;
}

export interface RFQDetail {
  id: number;
  name: string;
  state: string;
  date_order: string;
  amount_total: number;
  buyer_notes?: string | null;
  lines: RFQLine[];
}

// --- Order Tracking / Stage types ---

export interface Picking {
  id: number;
  name: string;
  state: string;
  scheduled_date: string | boolean;
  date_done: string | boolean;
}

export interface OrderInvoice {
  id: number;
  name: string;
  state: string;
  payment_state: string;
  amount_total: number;
  invoice_date: string | boolean;
}

export interface CarrierInfo {
  id: number;
  name: string;
}

export interface OrderStage {
  key: string;
  label: string;
}

export interface OrderReview {
  id: number;
  rating: number;
  review_text: string;
  create_date: string;
}

export interface ProductReview {
  id: number;
  rating: number;
  review_text: string;
  create_date: string;
  reviewer_name: string;
  can_delete: boolean;
}

export interface OrderTracking {
  order_id: number;
  name: string;
  state: string;
  invoice_status: string;
  amount_total: number;
  date_order: string;
  buyer_stage: string;
  stages: OrderStage[];
  carrier: CarrierInfo | false;
  tracking_reference: string | false;
  tracking_url: string | false;
  has_been_reviewed: boolean;
  review: OrderReview | null;
  pickings: Picking[];
  invoices: OrderInvoice[];
}

// --- Return types ---

export interface ReturnReason {
  id: number;
  name: string;
}

export interface ReturnRequest {
  id: number;
  name: string;
  sale_order_id: number;
  sale_order_name?: string;
  product_id: number;
  product_name: string;
  quantity: number;
  return_type: 'refund' | 'replacement';
  reason_category: string;
  reason_detail?: string;
  state: string;
  request_date: string;
}

export interface AdminReturnRequest extends ReturnRequest {
  partner_id: number;
  partner_name: string;
  admin_notes: string;
}

// --- Company partner types ---

export interface CompanyPartner {
  id: number;
  name: string;
  email: string | boolean;
  registration_number: string | boolean;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_date: string | boolean;
  create_date: string;
}

// --- Carrier types ---

export interface Carrier {
  id: number;
  name: string;
  tracking_url_template: string;
}

// --- Error utilities ---

export class OdooSessionExpiredError extends Error {
  constructor(path: string) {
    super(`Odoo session expired or invalid for ${path}`);
    this.name = 'OdooSessionExpiredError';
  }
}

export function extractOdooStatus(message: string): number | null {
  const match = message.match(/\[(\d{3})\]/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parses the `session_id` value out of a raw Set-Cookie header string.
 */
function extractSessionIdFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/(?:^|;\s*)session_id=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * The Odoo /api/returns POST controller reads its input via kwargs.get(...) (form-urlencoded).
 */
function toFormBody(data: Record<string, string | number>): string {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => body.set(key, String(value)));
  return body.toString();
}

/**
 * Server-side client wrapper for communicating with Odoo backend.
 */
export const odooClient = {
  async request<T>(path: string, options: OdooRequestInit = {}): Promise<T> {
    const url = `${ODOO_API_BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual',
    });

    if (res.type === 'opaqueredirect' || res.status === 303 || res.status === 302) {
      throw new OdooSessionExpiredError(path);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Odoo API Error: [${res.status}] ${errorText}`);
    }

    return res.json() as Promise<T>;
  },

  async getProducts(search?: string): Promise<Product[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Product[]>(`/api/products${query}`, {
      method: 'GET',
      next: { revalidate: 10 },
    });
  },

  async getProductDetail(id: number | string): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`, {
      method: 'GET',
      next: { revalidate: 10 },
    });
  },

  async getProductPricing(id: number | string, pricelistId?: number | string): Promise<ProductPricing> {
    const query = pricelistId ? `?pricelist_id=${pricelistId}` : '';
    return this.request<ProductPricing>(`/api/products/${id}/pricing${query}`, {
      method: 'GET',
      next: { revalidate: 30 },
    });
  },

  async login(loginVal: string, passwordVal: string): Promise<LoginResult> {
    const url = `${ODOO_API_BASE_URL}/api/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginVal, password: passwordVal }),
      cache: 'no-store',
    });

    const rawSetCookie = res.headers.get('set-cookie');
    const data = (await res.json()) as LoginResult;

    if (!res.ok) {
      throw new Error(`Odoo login failed: [${res.status}] ${data.error ?? 'Unknown error'}`);
    }

    const realSessionId = extractSessionIdFromSetCookie(rawSetCookie);
    if (!realSessionId) {
      throw new Error(
        'Odoo login succeeded but no session_id cookie was present in the response headers.'
      );
    }

    if (process.env.NODE_ENV !== 'production' && realSessionId !== data.session_id) {
      console.warn(
        '[odooClient.login] sid mismatch (expected): body=%s real=%s — using real Set-Cookie sid',
        data.session_id,
        realSessionId
      );
    }

    return { ...data, session_id: realSessionId };
  },

  async register(name: string, email: string, passwordVal: string, regNumber: string): Promise<any> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: passwordVal, registration_number: regNumber }),
      cache: 'no-store',
    });
  },

  async whoami(sessionId: string) {
    return this.request('/api/auth/whoami', {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async createRFQ(items: { product_id: number; variant_id?: number; quantity: number }[], sessionId: string) {
    return this.request('/api/rfq', {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ items }),
      cache: 'no-store',
    });
  },

  async getRFQStatus(sessionId: string): Promise<RFQItem[]> {
    return this.request<RFQItem[]>('/api/rfq/status', {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async getRFQDetail(id: number | string, sessionId: string): Promise<RFQDetail> {
    return this.request<RFQDetail>(`/api/rfq/${id}`, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async approveRFQ(id: number | string, sessionId: string) {
    return this.request(`/api/rfq/${id}/approve`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async getOrderTracking(orderId: number | string, sessionId: string): Promise<OrderTracking> {
    return this.request<OrderTracking>(`/api/orders/${orderId}/tracking`, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  // --- Returns ---

  async getReturnReasons(): Promise<ReturnReason[]> {
    return this.request<ReturnReason[]>('/api/returns/reasons', {
      method: 'GET',
      next: { revalidate: 60 },
    });
  },

  async createReturnRequest(
    data: {
      order_id: number;
      product_id: number;
      quantity: number;
      return_type: 'refund' | 'replacement';
      reason_category_id: number;
      reason_detail?: string;
    },
    sessionId: string
  ) {
    return this.request('/api/returns', {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: toFormBody({
        order_id: data.order_id,
        product_id: data.product_id,
        quantity: data.quantity,
        return_type: data.return_type,
        reason_category_id: data.reason_category_id,
        reason_detail: data.reason_detail ?? '',
      }),
      cache: 'no-store',
    });
  },

  async getReturnRequests(sessionId: string): Promise<{ returns: ReturnRequest[] }> {
    return this.request<{ returns: ReturnRequest[] }>('/api/returns', {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  // --- Reviews ---

  async getOrderReview(orderId: number, sessionId: string) {
    return this.request(`/api/orders/${orderId}/review`, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async createOrderReview(orderId: number, rating: number, reviewText: string, sessionId: string) {
    return this.request(`/api/orders/${orderId}/review`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ rating, review_text: reviewText }),
      cache: 'no-store',
    });
  },

  async submitOrderReview(orderId: number, rating: number, reviewText: string, sessionId: string) {
    return this.request(`/api/orders/${orderId}/review`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ rating, review_text: reviewText }),
      cache: 'no-store',
    });
  },

  async deleteReview(reviewId: number, sessionId: string) {
    return this.request(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async getProductReviews(productId: string, sessionId?: string): Promise<ProductReview[]> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['Cookie'] = `session_id=${sessionId}`;
    }
    return this.request<ProductReview[]>(`/api/products/${productId}/reviews`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
  },

  // --- Admin: Companies ---

  async adminListCompanies(sessionId: string, status?: string): Promise<CompanyPartner[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<CompanyPartner[]>(`/api/admin/companies${query}`, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async adminVerifyCompany(partnerId: number, sessionId: string) {
    return this.request(`/api/admin/companies/${partnerId}/verify`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async adminRejectCompany(partnerId: number, reason: string, sessionId: string) {
    return this.request(`/api/admin/companies/${partnerId}/reject`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ reason }),
      cache: 'no-store',
    });
  },

  // --- Admin: Returns ---

  async adminListReturns(sessionId: string, status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/admin/returns${query}`, {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async adminApproveReturn(returnId: number, sessionId: string) {
    return this.request(`/api/admin/returns/${returnId}/approve`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async adminRejectReturn(returnId: number, sessionId: string) {
    return this.request(`/api/admin/returns/${returnId}/reject`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  // --- Admin: Products ---

  async adminPublishProduct(productId: number, sessionId: string) {
    return this.request(`/api/admin/products/${productId}/publish`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  async adminUnpublishProduct(productId: number, sessionId: string) {
    return this.request(`/api/admin/products/${productId}/unpublish`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },

  // --- Admin: Order Tracking ---

  async adminSetOrderTracking(orderId: number, carrierId: number, trackingReference: string, sessionId: string) {
    return this.request(`/api/admin/orders/${orderId}/tracking`, {
      method: 'POST',
      headers: { Cookie: `session_id=${sessionId}` },
      body: JSON.stringify({ carrier_id: carrierId, tracking_reference: trackingReference }),
      cache: 'no-store',
    });
  },

  async adminListCarriers(sessionId: string): Promise<Carrier[]> {
    return this.request<Carrier[]>('/api/admin/carriers', {
      method: 'GET',
      headers: { Cookie: `session_id=${sessionId}` },
      cache: 'no-store',
    });
  },
};
// Admin-only view of a confirmed order, as returned by GET /api/rfq?state=sale
// for the admin console's Order Tracking & Shipping tab.
export interface AdminOrder extends RFQItem {
  partner_id: [number, string] | boolean;
  carrier_id?: [number, string] | boolean;
  tracking_reference?: string | boolean;
}