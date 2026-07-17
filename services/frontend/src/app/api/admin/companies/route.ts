import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../lib/odooClient';

export async function GET(request: Request) {
    const session = cookies().get('med_session');

    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? undefined;

    try {
        const companies = await odooClient.adminListCompanies(session.value, status);
        return NextResponse.json(companies);
    } catch (error: any) {
        console.error('[admin/companies] Odoo companies list fetch failed:', error);

        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json(
                { error: 'Session expired, please log in again' },
                { status: 401 }
            );
        }

        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json(
            { error: 'Failed to fetch companies from Odoo', detail: error?.message ?? 'Unknown error' },
            { status }
        );
    }
}