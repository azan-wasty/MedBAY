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
    const body = await request.json();
    const result = await odooClient.counterRFQ(id, body, session.value);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[rfq/${id}/counter] Odoo RFQ counter failed:`, error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit counter offer in Odoo', detail: error?.message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}
