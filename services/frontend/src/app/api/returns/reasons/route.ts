import { NextResponse } from 'next/server';
import { ODOO_API_BASE_URL } from '../../../../lib/config';

export async function GET() {
    try {
        const res = await fetch(`${ODOO_API_BASE_URL}/api/returns/reasons`, {
            method: 'GET',
            cache: 'no-store',
        });

        if (!res.ok) {
            const text = await res.text().catch(() => 'Unknown error');
            return NextResponse.json({ error: text }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[returns/reasons] Fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to load return reasons', detail: error?.message ?? 'Unknown' },
            { status: 502 }
        );
    }
}
