import { NextRequest, NextResponse } from 'next/server';
import { odooClient } from '../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || '';

  try {
    // Try to query Odoo
    const odooProducts = await odooClient.getProducts(search);

    // If Odoo returns products, return them. If empty, fall back to filtered mock data
    if (odooProducts && odooProducts.length > 0) {
      return NextResponse.json(odooProducts);
    }
  } catch (error) {
    console.warn('Odoo connection failed, falling back to mock catalog:', error);
  }

  // Fallback to mock products (filtered by search if present)
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
