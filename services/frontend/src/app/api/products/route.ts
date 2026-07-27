import { NextRequest, NextResponse } from 'next/server';
import { odooClient } from '../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../lib/constants';

// Set USE_MOCK_CATALOG=true in your .env to explicitly opt into mock data
// for local frontend-only development. It will NEVER activate automatically
// just because Odoo is unreachable or empty — that silent fallback is what
// caused mock product IDs to collide with real Odoo product IDs and get
// ordered against the wrong backend records.
const USE_MOCK_CATALOG = process.env.USE_MOCK_CATALOG === 'true';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';

  if (USE_MOCK_CATALOG) {
    let fallbackList = MOCK_PRODUCTS;
    if (search) {
      const searchLower = search.toLowerCase();
      fallbackList = MOCK_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description_sale.toLowerCase().includes(searchLower)
      );
    }
    return NextResponse.json(fallbackList);
  }

  try {
    const odooProducts = await odooClient.getProducts(search);
    // Odoo reachable — return whatever it has, including an empty catalog.
    // An empty result is real information (no products published yet),
    // not a signal to substitute fake data.
    return NextResponse.json(odooProducts ?? []);
  } catch (error) {
    console.error('Odoo connection failed while fetching products:', error);
    return NextResponse.json(
      { error: 'Unable to reach product catalog' },
      { status: 502 }
    );
  }
}