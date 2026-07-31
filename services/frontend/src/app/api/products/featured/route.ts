import { NextResponse } from 'next/server';
import { odooClient } from '../../../../lib/odooClient';
import { MOCK_PRODUCTS } from '../../../../lib/constants';
import type { Product } from '../../../../lib/odooClient';

// Matches the Odoo controller's own cap (FEATURED_MAX in controllers/main.py)
// so the blended list never grows larger than what the hero rotator is
// designed to page through.
const FEATURED_LIMIT = 8;

export async function GET() {
  let odooFeatured: Product[] = [];

  try {
    const result = await odooClient.getFeaturedProducts();
    if (Array.isArray(result)) {
      odooFeatured = result;
    }
  } catch (error) {
    console.warn('Odoo featured products fetch failed, continuing with mock only:', error);
  }

  // Mock products live in the 900000+ id range (see constants.ts) so they
  // can never collide with real Odoo-assigned ids — safe to blend the two
  // lists together rather than picking one source or the other. This keeps
  // the hero rotator populated even when no product has been flagged
  // "Featured on Homepage" in Odoo yet.
  const mockFeatured = (MOCK_PRODUCTS as Product[]).filter(
    (p) => p.marketplace_featured === true
  );

  const combined = [...odooFeatured, ...mockFeatured]
    .sort((a, b) => {
      const seqDiff = (a.featured_sequence ?? 10) - (b.featured_sequence ?? 10);
      return seqDiff !== 0 ? seqDiff : a.name.localeCompare(b.name);
    })
    .slice(0, FEATURED_LIMIT);

  return NextResponse.json(combined, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}