import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '../../../lib/odooClient';

export async function POST(request: Request) {
  const session = cookies().get('med_session');

  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided for RFQ' }, { status: 400 });
    }

    const result = await odooClient.createRFQ(items, session.value, notes);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[rfq] Odoo RFQ submission failed:', error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    // Odoo returns 403 when the buyer's company is not yet verified.
    // The error message from odooClient contains "[403]" — surface it as a
    // real 403 so the frontend can show the verification-gating modal.
    const msg: string = error?.message ?? '';
    if (msg.includes('[403]')) {
      return NextResponse.json(
        { error: 'Your company is currently unverified. You cannot submit a quote until an administrator verifies your account. Please wait for verification — you\'ll be notified once your company is approved.', verification_status: 'pending' },
        { status: 403 }
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