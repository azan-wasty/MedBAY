import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '../../../../lib/odooClient';

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
    const details = await odooClient.getRFQDetail(id, session.value);
    return NextResponse.json(details);
  } catch (error: any) {
    console.error(`[rfq/${id}] Odoo RFQ details fetch failed:`, error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch RFQ details from Odoo', detail: error?.message ?? 'Unknown error' },
      { status: 502 }
    );
  }
}
