import { NextResponse } from 'next/server';
import { odooClient } from '../../../../../lib/odooClient';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const productId = params.id;

    try {
        const pricing = await odooClient.getProductPricing(productId);
        return NextResponse.json(pricing);
    } catch (error: any) {
        console.error(`Odoo pricing fetch failed for ID: ${productId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch pricing from Odoo', detail: error?.message ?? 'Unknown error' },
            { status: 502 }
        );
    }
}