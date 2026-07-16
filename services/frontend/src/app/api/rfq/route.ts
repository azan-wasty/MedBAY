import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '../../../lib/odooClient';

export async function POST(request: Request) {
  const session = cookies().get('med_session');

  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided for RFQ' }, { status: 400 });
    }

    const result = await odooClient.createRFQ(items, session.value);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[rfq] Odoo RFQ submission failed:', error);

    if (error instanceof OdooSessionExpiredError) {
      // Odoo did not recognize the forwarded session as authenticated.
      // Clear our cookie so the client knows to re-login rather than
      // retrying forever with a dead sid.
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit RFQ to Odoo', detail: error?.message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}

export async function GET() {
  const session = cookies().get('med_session');

  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  try {
    const rfqs = await odooClient.getRFQStatus(session.value);
    return NextResponse.json(rfqs);
  } catch (error: any) {
    console.error('[rfq/status] Odoo RFQ status fetch failed:', error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch RFQ status from Odoo', detail: error?.message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}