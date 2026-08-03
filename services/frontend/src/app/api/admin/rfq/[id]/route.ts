import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '../../../../../lib/odooClient';

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
        const result = await odooClient.adminGetRfqDetail(id, session.value);
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error: any) {
        console.error(`[admin/rfq/${id}] Failed to fetch RFQ detail:`, error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch RFQ detail', detail: error?.message ?? 'Unknown error' },
            { status: 502 }
        );
    }
}