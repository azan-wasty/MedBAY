import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../lib/odooClient';

export async function POST(request: Request) {
    const session = cookies().get('med_session');

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    try {
        const { order_id, product_id, quantity, return_type, reason_category_id, reason_detail } = await request.json();

        if (!order_id || !product_id || !quantity || !return_type || !reason_category_id) {
            return NextResponse.json(
                { error: 'order_id, product_id, quantity, return_type, and reason_category_id are all required' },
                { status: 400 }
            );
        }

        const result = await odooClient.createReturnRequest(
            {
                order_id: typeof order_id === 'number' ? order_id : parseInt(order_id, 10),
                product_id: typeof product_id === 'number' ? product_id : parseInt(product_id, 10),
                quantity: typeof quantity === 'number' ? quantity : parseFloat(quantity),
                return_type,
                reason_category_id: typeof reason_category_id === 'number' ? reason_category_id : parseInt(reason_category_id, 10),
                reason_detail: reason_detail ?? ''
            },
            session.value
        );
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[returns] Odoo return submission failed:', error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to submit return request to Odoo', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}

export async function GET() {
    const session = cookies().get('med_session');

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    try {
        const returns = await odooClient.getReturnRequests(session.value);
        return NextResponse.json(returns);
    } catch (error: any) {
        console.error('[returns] Odoo returns list fetch failed:', error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to fetch return requests from Odoo', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}