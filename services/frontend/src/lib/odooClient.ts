import { ODOO_API_BASE_URL } from './config';

declare const process: any;

export interface OdooRequestInit extends RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

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
  vendor_id?: [number, string] | boolean;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked';
  low_stock_threshold?: number;
  qty_available?: number;
  // Raw attribute_line ids returned on the LIST endpoint only, as a cheap
  // "does this product have variants?" hint (attribute_lines/variants below
  // are only fully expanded on the /api/products/<id> detail endpoint —
  // kept off the list endpoint to keep the catalog grid payload light).
  attribute_line_ids?: number[];
  attribute_lines?: AttributeLine[];
  variants?: ProductVariant[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  partner_id: number;
  is_admin?: boolean;
  verification_status?: 'pending' | 'verified' | 'rejected';
}

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

export interface OrderTracking {
  order_id: number;
  name: string;
  state: string;
  invoice_status: string;
  amount_total: number;
  date_order: string;
  pickings: Picking[];
  invoices: OrderInvoice[];
}

export interface ReturnRequest {
  id: number;
  name: string;
  sale_order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  return_type: 'refund' | 'replacement';
  state: string;
  request_date: string;
}

export interface CompanyPartner {
  id: number;
  name: string;
  email: string | boolean;
  registration_number: string | boolean;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_date: string | boolean;
  create_date: string;
}

/**
 * The Odoo /api/returns POST controller reads its input via `kwargs.get(...)`
 * (type='http', not a JSON body parse like /api/rfq or /api/admin/companies/*
 * /reject). That means it expects a form-urlencoded body, not JSON — sending
 * JSON here would silently produce zeroed-out values server-side because
 * kwargs.get('order_id', 0) would fall through to its default every time.
 */
function toFormBody(data: Record<string, string | number>): string {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => body.set(key, String(value)));
  return body.toString();
}

export interface LoginResult {
  success: boolean;
  session_id?: string;
  user?: User;
  error?: string;
}

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
}

export interface RFQDetail {
  id: number;
  name: string;
  state: string;
  date_order: string;
  amount_total: number;
  lines: RFQLine[];
}

export class OdooSessionExpiredError extends Error {
  constructor(path: string) {
    super(`Odoo session expired or invalid for ${path}`);
    this.name = 'OdooSessionExpiredError';
  }
}

/**
 * Parses the `session_id` value out of a raw Set-Cookie header string, e.g.
 * "session_id=abc123; Expires=...; Max-Age=604800; HttpOnly; Path=/"
 * -> "abc123"
 */
function extractSessionIdFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const match = setCookie.match(/(?:^|;\s*)session_id=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Server-side client wrapper for communicating with Odoo backend.
 * All functions here are run on the Next.js server-side.
 */
export const odooClient = {
  /**
   * Helper to perform fetch requests to Odoo.
   *
   * `redirect: 'manual'` is critical: Odoo responds to an expired/invalid
   * session on a `type='http'` auth='user' route with a 303 redirect to
   * `/web/login`. The default fetch behavior transparently FOLLOWS that
   * redirect and hands you back the login page's HTML with a 200 status —
   * which then blows up on `res.json()`. With manual redirect handling we
   * see the 303 directly and can translate it into a clear, typed error.
   */
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

  /**
   * Fetch products catalog
   */
  async getProducts(search?: string): Promise<Product[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Product[]>(`/api/products${query}`, {
      method: 'GET',
      next: { revalidate: 10 }, // cache for 10s
    });
  },

  /**
   * Fetch product detail by ID
   */
  async getProductDetail(id: number | string): Promise<Product> {
    return this.request<Product>(`/api/products/${id}`, {
      method: 'GET',
      next: { revalidate: 10 },
    });
  },

  /**
   * Fetch tiered/bulk pricing breaks for a product
   */
  async getProductPricing(id: number | string, pricelistId?: number | string): Promise<ProductPricing> {
    const query = pricelistId ? `?pricelist_id=${pricelistId}` : '';
    return this.request<ProductPricing>(`/api/products/${id}/pricing${query}`, {
      method: 'GET',
      next: { revalidate: 30 },
    });
  },

  /**
   * Log in user.
   *
   * THE FIX: Odoo rotates the session id on successful authentication
   * (session-fixation protection) — it issues a fresh sid post-login
   * rather than reusing the pre-auth anonymous sid. The `session_id` field
   * in the controller's JSON body reflects `request.session.sid` as read
   * DURING the controller call, which is the OLD pre-rotation sid. The
   * real, final, persisted sid only shows up in Odoo's actual `Set-Cookie`
   * response header. We now parse that header directly and treat it as
   * authoritative, ignoring the (stale) body value.
   */
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
      // Nothing to fall back to safely — the body's sid is known-stale.
      // Surface this loudly rather than silently using a sid we know is wrong.
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

  /**
   * Register buyer user & company
   */
  async register(
    name: string,
    email: string,
    passwordVal: string,
    regNumber: string
  ): Promise<{ success: boolean; user?: Partial<User>; error?: string }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password: passwordVal,
        registration_number: regNumber,
      }),
      cache: 'no-store',
    });
  },

  /**
   * Diagnostic helper: confirms whether Odoo resolves an authenticated
   * session for the given sid, independent of RFQ business logic.
   */
  async whoami(sessionId: string): Promise<{ sid: string; uid: number | false; db: string; login?: string }> {
    return this.request('/api/auth/whoami', {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Create RFQ (Draft Sales Order) in Odoo
   */
  async createRFQ(
    items: { product_id: number; variant_id?: number; quantity: number }[],
    sessionId: string
  ): Promise<{ success: boolean; rfq_id?: number; name?: string; error?: string }> {
    return this.request('/api/rfq', {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      body: JSON.stringify({ items }),
      cache: 'no-store',
    });
  },

  /**
   * Retrieve buyer company's RFQs and their statuses
   */
  async getRFQStatus(sessionId: string): Promise<RFQItem[]> {
    return this.request<RFQItem[]>('/api/rfq/status', {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Retrieve details of a specific RFQ
   */
  async getRFQDetail(id: number | string, sessionId: string): Promise<RFQDetail> {
    return this.request<RFQDetail>(`/api/rfq/${id}`, {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Approve/confirm a quotation into a sales order
   */
  async approveRFQ(id: number | string, sessionId: string): Promise<{ success: boolean; order_id: number; state: string; amount_total: number }> {
    return this.request<{ success: boolean; order_id: number; state: string; amount_total: number }>(`/api/rfq/${id}/approve`, {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Fetch shipping (stock picking) and invoicing status for a confirmed order
   */
  async getOrderTracking(orderId: number | string, sessionId: string): Promise<OrderTracking> {
    return this.request<OrderTracking>(`/api/orders/${orderId}/tracking`, {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Submit a return request against a delivered order line.
   * See `toFormBody` above for why this is urlencoded, not JSON.
   */
  async createReturnRequest(
    data: {
      order_id: number;
      product_id: number;
      quantity: number;
      return_type: 'refund' | 'replacement';
      reason: string;
    },
    sessionId: string
  ): Promise<{ success: boolean; return_id?: number; name?: string; state?: string; error?: string }> {
    return this.request('/api/returns', {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: toFormBody(data),
      cache: 'no-store',
    });
  },

  /**
   * Retrieve the calling buyer company's own return requests
   */
  async getReturnRequests(sessionId: string): Promise<{ returns: ReturnRequest[] }> {
    return this.request<{ returns: ReturnRequest[] }>('/api/returns', {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Admin: list companies pending/verified/rejected B2B verification
   */
  async adminListCompanies(sessionId: string, status?: string): Promise<CompanyPartner[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<CompanyPartner[]>(`/api/admin/companies${query}`, {
      method: 'GET',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Admin: verify a company for B2B ordering
   */
  async adminVerifyCompany(
    partnerId: number,
    sessionId: string
  ): Promise<{ success: boolean; verification_status: string }> {
    return this.request(`/api/admin/companies/${partnerId}/verify`, {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Admin: reject a company's verification, with an optional reason note
   */
  async adminRejectCompany(
    partnerId: number,
    reason: string,
    sessionId: string
  ): Promise<{ success: boolean; verification_status: string }> {
    return this.request(`/api/admin/companies/${partnerId}/reject`, {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      body: JSON.stringify({ reason }),
      cache: 'no-store',
    });
  },

  /**
   * Admin: approve a submitted return request
   */
  async adminApproveReturn(
    returnId: number,
    sessionId: string
  ): Promise<{ success: boolean; state: string }> {
    return this.request(`/api/admin/returns/${returnId}/approve`, {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },

  /**
   * Admin: reject a submitted return request
   */
  async adminRejectReturn(
    returnId: number,
    sessionId: string
  ): Promise<{ success: boolean; state: string }> {
    return this.request(`/api/admin/returns/${returnId}/reject`, {
      method: 'POST',
      headers: {
        Cookie: `session_id=${sessionId}`,
      },
      cache: 'no-store',
    });
  },
};

/**
 * Best-effort extraction of the numeric status code Odoo embedded in the
 * `Odoo API Error: [xxx] ...` message thrown by `odooClient.request`.
 * Lets Next.js API routes forward the real status (e.g. 403 Forbidden for
 * non-admins, 404 Not Found) instead of collapsing every failure to a
 * generic 502.
 */
export function extractOdooStatus(message: string): number | null {
  const match = message.match(/\[(\d{3})\]/);
  return match ? parseInt(match[1], 10) : null;
}