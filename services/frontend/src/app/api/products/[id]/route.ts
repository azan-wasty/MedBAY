import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../../lib/constants';

// Set USE_MOCK_CATALOG=true in your .env to explicitly opt into mock data
// for local frontend-only development. It will NEVER activate automatically
// just because Odoo is unreachable — that silent fallback is what caused
// mock product IDs to collide with real Odoo product IDs and get ordered
// against the wrong backend records.
const USE_MOCK_CATALOG = process.env.USE_MOCK_CATALOG === 'true';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const productId = params.id;

  if (USE_MOCK_CATALOG) {
    const mockProduct = MOCK_PRODUCTS.find((p) => p.id.toString() === productId);
    if (mockProduct) {
      return NextResponse.json(mockProduct);
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  try {
    const odooProduct = await odooClient.getProductDetail(productId);
    if (odooProduct) {
      return NextResponse.json(odooProduct);
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  } catch (error) {
    console.error(`Odoo product fetch failed for ID: ${productId}:`, error);
    return NextResponse.json(
      { error: 'Unable to reach product catalog' },
      { status: 502 }
    );
  }
}