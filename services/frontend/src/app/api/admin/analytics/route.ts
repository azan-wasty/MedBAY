import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient, OdooSessionExpiredError } from '@/lib/odooClient';

export async function GET(request: Request) {
  const session = cookies().get('med_session');

  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || searchParams.get('period') || undefined;
    const date_from = searchParams.get('date_from') || searchParams.get('from') || undefined;
    const date_to = searchParams.get('date_to') || searchParams.get('to') || undefined;

    const data = await odooClient.getAdminAnalytics(session.value, { preset, date_from, date_to });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[admin/analytics] Failed to fetch analytics data:', error);

    if (error instanceof OdooSessionExpiredError) {
      cookies().delete('med_session');
      return NextResponse.json(
        { error: 'Session expired, please log in again' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to load admin analytics' },
      { status: 500 }
    );
  }
}
