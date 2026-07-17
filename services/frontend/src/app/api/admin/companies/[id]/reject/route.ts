import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../../../lib/odooClient';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = cookies().get('med_session');
    const id = params.id;

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    try {
        const { reason } = await request.json().catch(() => ({ reason: '' }));
        const result = await odooClient.adminRejectCompany(parseInt(id, 10), reason ?? '', session.value);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error(`[admin/companies/${id}/reject] failed:`, error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to reject company', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}