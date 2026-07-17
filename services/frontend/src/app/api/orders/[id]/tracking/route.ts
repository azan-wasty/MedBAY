import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../../lib/odooClient';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = cookies().get('med_session');
    const id = params.id;

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    try {
        const tracking = await odooClient.getOrderTracking(id, session.value);
        return NextResponse.json(tracking);
    } catch (error: any) {
        console.error(`[orders/${id}/tracking] Odoo tracking fetch failed:`, error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to fetch order tracking from Odoo', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}