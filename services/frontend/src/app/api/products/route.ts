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
  const category = searchParams.get('category') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const minPriceParam = searchParams.get('min_price');
  const maxPriceParam = searchParams.get('max_price');

  const limit = limitParam !== null ? Number(limitParam) : undefined;
  const offset = offsetParam !== null ? Number(offsetParam) : undefined;
  const min_price = minPriceParam !== null ? Number(minPriceParam) : undefined;
  const max_price = maxPriceParam !== null ? Number(maxPriceParam) : undefined;

  if (USE_MOCK_CATALOG) {
    const filteredMock = MOCK_PRODUCTS.filter((p) => matchesSearch(p, search));
    if (limit !== undefined) {
      const start = offset || 0;
      const sliced = filteredMock.slice(start, start + limit);
      return NextResponse.json({
        products: sliced,
        total: filteredMock.length,
        limit,
        offset: start,
        has_more: start + sliced.length < filteredMock.length,
      });
    }
    return NextResponse.json(filteredMock);
  }

  try {
    const res = await odooClient.getProducts({
      search,
      category,
      sort,
      limit,
      offset,
      min_price,
      max_price,
    });
    return NextResponse.json(res);
  } catch (error) {
    console.error('Odoo connection failed while fetching products, continuing with mock catalog:', error);
    const mockProducts = (MOCK_PRODUCTS as Product[]).filter((p) => matchesSearch(p, search));
    if (limit !== undefined) {
      const start = offset || 0;
      const sliced = mockProducts.slice(start, start + limit);
      return NextResponse.json({
        products: sliced,
        total: mockProducts.length,
        limit,
        offset: start,
        has_more: start + sliced.length < mockProducts.length,
      });
    }
    return NextResponse.json(mockProducts);
  }
} 