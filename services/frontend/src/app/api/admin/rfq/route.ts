import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../lib/odooClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    const session = cookies().get('med_session');

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    try {
        const rfqs = await odooClient.adminListRfqs(session.value, state, limit);
        return NextResponse.json(rfqs, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error: any) {
        console.error('[admin/rfq] Odoo quotations list fetch failed:', error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to fetch quotations from Odoo', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}
