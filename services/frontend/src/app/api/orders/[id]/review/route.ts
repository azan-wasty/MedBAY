import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError, extractOdooStatus } from '../../../../../lib/odooClient';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const session = cookies().get('med_session');
    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const data = await odooClient.getOrderReview(parseInt(params.id), session.value);
        return NextResponse.json(data);
    } catch (error: any) {
        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = cookies().get('med_session');
    if (!session?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await req.json();
        const data = await odooClient.createOrderReview(
            parseInt(params.id),
            body.rating,
            body.review_text,
            session.value,
        );
        return NextResponse.json(data);
    } catch (error: any) {
        if (error instanceof OdooSessionExpiredError) {
            cookies().delete('med_session');
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }
        const status = extractOdooStatus(error?.message ?? '') ?? 502;
        return NextResponse.json({ error: error?.message ?? 'Unknown error' }, { status });
    }
}
