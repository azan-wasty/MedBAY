import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../lib/odooClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    const session = cookies().get('med_session');
    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const carriers = await odooClient.adminListCarriers(session.value);
        return NextResponse.json(carriers, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error: any) {
        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status });
    }
}
