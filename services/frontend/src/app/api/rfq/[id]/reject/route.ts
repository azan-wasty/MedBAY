import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '../../../../../lib/odooClient';

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
    const body = await request.json().catch(() => ({}));
    const result = await odooClient.rejectRFQ(id, body.rejection_reason, session.value);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[rfq/${id}/reject] Odoo RFQ rejection failed:`, error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reject RFQ in Odoo', detail: error?.message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}
