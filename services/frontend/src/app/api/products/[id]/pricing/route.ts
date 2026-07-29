import { NextResponse } from 'next/server';
import { odooClient } from '../../../../../lib/odooClient';
import { MOCK_PRODUCTS, MOCK_PRICING_TIERS } from '../../../../../lib/constants';
import type { ProductPricing } from '../../../../../lib/odooClient';

function buildMockPricing(productId: number): ProductPricing | null {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) return null;

    const tiers = MOCK_PRICING_TIERS[productId] ?? [
        { min_qty: product.min_order_qty || 1, discount_pct: 0 },
    ];
    const basePrice = product.list_price;

    const price_breaks = tiers.map((tier) => ({
        min_qty: tier.min_qty,
        price: Math.round(basePrice * (1 - tier.discount_pct / 100) * 100) / 100,
        discount_pct: tier.discount_pct,
    }));

    return {
        product_id: productId,
        base_price: basePrice,
        currency: 'USD',
        price_breaks,
    };
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const productId = params.id;

    try {
        const pricing = await odooClient.getProductPricing(productId);
        return NextResponse.json(pricing);
    } catch (error: any) {
        // Mock ids live in the 900000+ range and never collide with real
        // Odoo ids, so a lookup miss here might just mean this is a
        // blended-in mock product (e.g. from the featured rail) rather
        // than a real backend failure.
        const numericId = parseInt(productId, 10);
        const mockPricing = Number.isFinite(numericId) ? buildMockPricing(numericId) : null;
        if (mockPricing) {
            return NextResponse.json(mockPricing);
        }

        console.error(`Odoo pricing fetch failed for ID: ${productId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch pricing from Odoo', detail: error?.message ?? 'Unknown error' },
            { status: 502 }
        );
    }
}