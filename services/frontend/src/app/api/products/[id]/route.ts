import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../../lib/constants';

// Set USE_MOCK_CATALOG=true in your .env to force every id to resolve
// against the mock catalog only (local frontend-only development).
//
// Outside of that flag, Odoo is always tried first. A miss only falls
// through to MOCK_PRODUCTS, and only because mock ids are reserved in the
// 900000+ range (see constants.ts) and can never collide with a real
// Odoo-assigned id — so an id in that range unambiguously belongs to a
// mock product (e.g. one blended into the featured rail), not a
// misrouted real order/record.
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
  } catch (error) {
    // Mock ids live in the 900000+ range and never collide with real Odoo
    // ids, so a lookup miss here might just mean the id belongs to a mock
    // product blended into the featured rail — check before treating this
    // as a hard failure.
    const mockProduct = MOCK_PRODUCTS.find((p) => p.id.toString() === productId);
    if (mockProduct) {
      return NextResponse.json(mockProduct);
    }
    console.error(`Odoo product fetch failed for ID: ${productId}:`, error);
    return NextResponse.json(
      { error: 'Unable to reach product catalog' },
      { status: 502 }
    );
  }

  const mockProduct = MOCK_PRODUCTS.find((p) => p.id.toString() === productId);
  if (mockProduct) {
    return NextResponse.json(mockProduct);
  }
  return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}