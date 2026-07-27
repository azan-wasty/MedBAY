import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../../lib/constants';
import type { Product } from '../../../../lib/odooClient';

export async function GET() {
  try {
    const odooFeatured = await odooClient.getFeaturedProducts();
    if (odooFeatured && Array.isArray(odooFeatured)) {
      return NextResponse.json(odooFeatured, {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
        },
      });
    }
  } catch (error) {
    console.warn('Odoo featured products fetch failed, using fallback:', error);
  }

  // Fallback to mock products marked as featured, or empty array if none
  const featuredMock = (MOCK_PRODUCTS as Product[]).filter(
    (p) => p.marketplace_featured === true
  );

  return NextResponse.json(featuredMock, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
