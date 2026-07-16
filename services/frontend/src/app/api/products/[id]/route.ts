import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../../lib/constants';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const productId = params.id;

  try {
    // Try to query Odoo
    const odooProduct = await odooClient.getProductDetail(productId);
    if (odooProduct) {
      return NextResponse.json(odooProduct);
    }
  } catch (error) {
    console.warn(`Odoo product fetch failed for ID: ${productId}, trying mock data:`, error);
  }

  // Fallback to mock product
  const mockProduct = MOCK_PRODUCTS.find((p) => p.id.toString() === productId);

  if (mockProduct) {
    return NextResponse.json(mockProduct);
  }

  return NextResponse.json({ error: 'Product not found' }, { status: 404 });
}
