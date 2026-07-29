import { NextRequest, NextResponse } from 'next/server';
import { odooClient } from '../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../lib/constants';
import type { Product } from '../../../lib/odooClient';

// Set USE_MOCK_CATALOG=true in your .env to force the catalog to serve
// mock data only, with no Odoo call at all (local frontend-only dev).
const USE_MOCK_CATALOG = process.env.USE_MOCK_CATALOG === 'true';

function matchesSearch(p: { name: string; description_sale: string }, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return p.name.toLowerCase().includes(q) || p.description_sale.toLowerCase().includes(q);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';

  if (USE_MOCK_CATALOG) {
    return NextResponse.json(MOCK_PRODUCTS.filter((p) => matchesSearch(p, search)));
  }

  let odooProducts: Product[] = [];
  try {
    odooProducts = (await odooClient.getProducts(search)) ?? [];
  } catch (error) {
    // Odoo unreachable — don't hard-fail the whole catalog page, fall
    // through and serve whatever the mock catalog has instead.
    console.error('Odoo connection failed while fetching products, continuing with mock catalog:', error);
  }

  // Mock products live in the 900000+ id range (see constants.ts) so they
  // can never collide with real Odoo-assigned ids — safe to blend the two
  // lists together. Real Odoo products come first; mock products matching
  // the same search term fill out the rest, so the catalog is never empty
  // just because nothing has been published in Odoo yet.
  const mockProducts = (MOCK_PRODUCTS as Product[]).filter((p) => matchesSearch(p, search));
  const odooIds = new Set(odooProducts.map((p) => p.id));
  const combined = [...odooProducts, ...mockProducts.filter((p) => !odooIds.has(p.id))];

  return NextResponse.json(combined);
} 